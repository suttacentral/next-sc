import json
import os
import re
import datetime
from collections import defaultdict

import stripe
from flask import current_app, request
from flask_restful import Resource
from flask_mail import Message
from sortedcontainers import SortedDict

from common.arangodb import get_db
from common.extensions import make_cache_key, cache, mail

from common.queries import (CURRENCIES, DICTIONARIES, LANGUAGES, MENU, SUBMENU, PARAGRAPHS, PARALLELS,
                            SUTTA_VIEW, SUTTAPLEX_LIST, IMAGES, EPIGRAPHS, WHY_WE_READ, DICTIONARYFULL, GLOSSARY,
                            DICTIONARY_ADJACENT, DICTIONARY_SIMILAR, EXPANSION, PWA)

from common.utils import (flat_tree, language_sort, recursive_sort, sort_parallels_key, sort_parallels_type_key,
                          groupby_unsorted, in_thread)


class Languages(Resource):
    """
    Languages API endpoint.
    """

    @cache.cached(key_prefix=make_cache_key, timeout=600)
    def get(self):
        """
        Send list of available languages
        ---
        parameters:
           - in: query
             name: all
             type: boolean
        responses:
            200:
                description: List of available languages
                schema:
                    type: array
                    items:
                        schema:
                            id: language
                            type: object
                            properties:
                                _rev:
                                    type: string
                                uid:
                                    type: string
                                name:
                                    type: string
                                iso_code:
                                    type: string
        """

        include_all = request.args.get('all', False)

        db = get_db()
        languages = list(db.aql.execute(LANGUAGES))
        available_languages = [l['iso_code'] for l in db['available_languages'].all()]

        response = languages if include_all else [l for l in languages if l['iso_code'] in available_languages]

        return response, 200


class Menu(Resource):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.num_regex = re.compile(r'^[^\d]*?([\d]+)$')

    @cache.cached(key_prefix=make_cache_key, timeout=600)
    def get(self, submenu_id=None):
        """
        Send Menu structure
        ---
        responses:
            200:
                description: Menu structure
                schema:
                    id: Menu
                    type: object
                    properties:
                        <uid_1>:
                            $ref: '#/definitions/MenuItem'
                        <uid_2...x>:
                            $ref: '#/definitions/MenuItem'
        definitions:
            MenuItem:
                type: object
                properties:
                    name:
                        type: string
                    uid:
                        required: false
                        type: string
                    id:
                        required: false
                        type: string
                    num:
                        type: number
                    children:
                        type: array
                        items:
                            type: MenuItem
                    has_children:
                        required: false
                        type: boolean
                    lang:
                        required: false
                        type: string
        """
        language = request.args.get('language', current_app.config.get('DEFAULT_LANGUAGE'))

        return self.get_data(submenu_id, bind_vars={'language': language}), 200

    def get_data(self, submenu_id=None, menu_query=MENU, submenu_query=SUBMENU, **kwargs):
        db = get_db()

        bind_vars = kwargs.get('bind_vars', {})

        if submenu_id:
            bind_vars['submenu_id'] = submenu_id
            divisions = db.aql.execute(submenu_query, bind_vars=bind_vars)
            data = list(divisions)
        else:
            divisions = db.aql.execute(menu_query, bind_vars=bind_vars)
            data = self.group_by_parents(divisions, ['pitaka'])

        for pitaka in data:
            if 'children' in pitaka:
                uid = pitaka['uid']
                children = pitaka.pop('children')
                if uid == 'pitaka/sutta':
                    pitaka['children'] = self.group_by_parents(children, ['grouping'])
                else:
                    pitaka['children'] = self.group_by_parents(children, ['sect'])
                    self.group_by_language(pitaka)

        self.recursive_cleanup(data, mapping={})

        return data

    @staticmethod
    def num_sort_key(entry):
        return entry.get('num') or -1

    @staticmethod
    def group_by_parent_property(entries, prop):
        return ((json.loads(key), list(group))
                for key, group
                in groupby_unsorted(entries, lambda d: json.dumps(d['parents'].get(prop), sort_keys=True))
                )

    def group_by_parents(self, entries, props):
        out = []
        prop = props[0]
        remaining_props = props[1:]
        for parent, children in self.group_by_parent_property(entries, prop):
            if parent is None:
                # This intentionally looks as bad as possible in the menu
                # it's a "hey classify me!"
                parent = {
                    'uid': f'{prop}/none',
                    'name': f'None {prop}',
                    'num': 84000
                }
            out.append(parent)
            if remaining_props:
                parent['children'] = self.group_by_parents(children, remaining_props)
            else:
                parent['children'] = children
        return sorted(out, key=self.num_sort_key)

    @classmethod
    def group_by_language(cls, pitaka):
        i = 0
        while i < len(pitaka['children']):
            child = pitaka['children'][i]
            new_data = defaultdict(list)
            for sub_child in child['children']:
                iso = sub_child.pop('lang_iso', None)
                new_data[iso].append(sub_child)
            child.pop('children')
            new_data = [{**child, **cls.get_additional_data_from_child(iso, children),'children': children} for
                        iso, children in new_data.items()]
            for data_item in new_data:
                for child in data_item['children']:
                    try:
                        del child['lang_name']
                    except KeyError:
                        pass
            pitaka['children'] = pitaka['children'][:i] + new_data + pitaka['children'][i + 1:]
            i += len(new_data)

    @staticmethod
    def get_additional_data_from_child(iso, children):
        data = {}
        if iso:
            data['lang_iso'] = iso
        try:
            data['lang_name'] = children[0]['lang_name']
        except KeyError:
            pass
        return data

    def update_display_num(self, menu_entry):
        display_num = menu_entry.get('display_num')
        if 'id' in menu_entry and display_num is None:
            m = self.num_regex.match(menu_entry['id'])
            if m:
                entry_name = menu_entry.get('name', '')
                if entry_name and m[1] not in entry_name:
                    display_num = m[1]
        if display_num:
            menu_entry['display_num'] = display_num.replace('-', '–\u2060')

    def recursive_cleanup(self, menu_entries, mapping):
        menu_entries.sort(key=self.num_sort_key)
        for menu_entry in menu_entries:
            mapping[menu_entry['uid']] = menu_entry
            self.update_display_num(menu_entry)
            if 'descendents' in menu_entry:
                descendents = menu_entry.pop('descendents')
                mapping.update({d['uid']: d for d in descendents})
                del menu_entry['uid']
                for descendent in descendents:
                    parent = mapping[descendent.pop('from')]
                    if 'children' not in parent:
                        parent['children'] = []
                    parent['children'].append(descendent)
            if 'type' in menu_entry:
                if menu_entry['type'] in ('div', 'division'):
                    del menu_entry['uid']
            if 'parents' in menu_entry:
                del menu_entry['parents']
            if 'children' in menu_entry:
                children = menu_entry['children']
                self.recursive_cleanup(children, mapping=mapping)


class SuttaplexList(Resource):
    @cache.cached(key_prefix=make_cache_key, timeout=600)
    def get(self, uid):
        """
        Send suttaplex for given uid. It is represented in flat list structure where order matters.
        [vagga, vagga, text, text] represents:
        vagga
            vagga
                text
                text
        ---
        parameters:
           - in: path
             name: uid
             type: string
             required: true
        responses:
            200:
                description: Suttaplex list
                schema:
                    id: suttaplex-list
                    type: array
                    items:
                        $ref: '#/definitions/Suttaplex'
        definitions:
            Suttaplex:
                type: object
                properties:
                    uid:
                        type: string
                    blurb:
                        type: string
                    difficulty:
                        required: false
                        type: number
                    original_title:
                        type: string
                    type:
                        type: string
                    translations:
                        type: array
                        items:
                            $ref: '#/definitions/Translation'
            Translation:
                type: object
                properties:
                    author:
                        type: string
                    id:
                        type: string
                    lang:
                        type: string
                    title:
                        type: string
        """
        language = request.args.get('language', current_app.config.get('DEFAULT_LANGUAGE'))
        uid = uid.replace('/', '-').strip('-')

        db = get_db()
        results = db.aql.execute(SUTTAPLEX_LIST,
                                 bind_vars={'language': language, 'uid': uid})

        difficulties = {
            3: 'advanced',
            2: 'intermediate',
            1: 'beginner'
        }

        data = []
        edges = {}
        for result in results:
            _from = result.pop('from')
            if result['difficulty']:
                result['difficulty'] = {'name': difficulties[result['difficulty']],
                                        'level': result['difficulty']}
            parent = None
            try:
                parent = edges[_from]
            except KeyError:
                data.append(result)
            _id = f'root/{result["uid"]}'
            edges[_id] = result
            result['translations'] = sorted(result['translations'], key=language_sort(result['root_lang']))

            if parent:
                try:
                    parent['children'].append(result)
                except KeyError:
                    parent['children'] = [result]

        recursive_sort(data, 'num')  # Sorts data inplace

        data = flat_tree(data)

        return data, 200


class Parallels(Resource):
    @cache.cached(key_prefix=make_cache_key, timeout=600)
    def get(self, uid):
        """
        Send parallel information for given sutta.
        ---
        parameters:
           - in: path
             name: uid
             type: string
             required: true
        responses:
            200:
                description: Suttaplex list
                schema:
                    id: suttaplex-parallels
                    type: object
                    properties:
                        first_key:
                            description: "first key is the id of first parallel, second of the second and so on."
                            type: array
                            items:
                                $ref: '#/definitions/Parallel'

        definitions:
            Parallel:
                type object:
                properties:
                    type:
                        type: string
                    partial:
                        type: boolean
                    to:
                        type: array
                        items:
                            $ref: '#/definitions/Suttaplex-parallel'
            Suttaplex-parallel:
                type: object
                properties:
                    uid:
                        type: string
                    difficulty:
                        required: false
                        type: number
                    original_title:
                        type: string
                    type:
                        type: string
                    translations:
                        type: array
                        items:
                            $ref: '#/definitions/Translation'
        """
        language = request.args.get('language', current_app.config.get('DEFAULT_LANGUAGE'))
        uid = uid.replace('/', '-').strip('-')
        uid = f'root/{uid}'

        db = get_db()
        results = db.aql.execute(PARALLELS,
                                 bind_vars={'language': language, 'uid': uid})

        data = SortedDict(sort_parallels_key)
        for result in results:
            if result['to'].get('uid') == 'orphan':
                for k in ('original_title', 'translated_title'):
                    result['to'][k] = ''
                result['to']['acronym'] = result['to']['to'].split('#')[0]
            _from = result.pop('from')
            try:
                data[_from].append(result)
            except KeyError:
                data[_from] = [result]
            result['to']['translations'] = sorted(result['to']['translations'],
                                                  key=language_sort(result['to']['root_lang']))
        for entry in data:
            data[entry] = sorted(data[entry], key=sort_parallels_type_key)

        return data, 200


class LookupDictionaries(Resource):
    @cache.cached(key_prefix=make_cache_key, timeout=600)
    def get(self):
        """
        Send parallel information for given sutta.
        ---
        parameters:
           - in: query
             name: from
             type: string
             required: true
           - in: query
             name: to
             type: string
           - in: query
             name: fallback
             type: string
        responses:
            200:
                schema:
                    id: dictionary
                    type: object
                    properties:
                        from:
                            type: string
                        to:
                            type: string
                        dictionary:
                            type: array
                            items:
                                type: array
                                items:
                                    type: string
        """
        to_lang = request.args.get('to', current_app.config.get('DEFAULT_LANGUAGE'))
        from_lang = request.args.get('from', None)

        fallback = request.args.get('fallback', 'false')
        main_dict = False if fallback == 'true' else True

        if from_lang is None:
            return 'from not specified', 422

        db = get_db()

        result = db.aql.execute(DICTIONARIES,
                                bind_vars={'from': from_lang, 'to': to_lang, 'main': main_dict})

        try:
            return result.next(), 200
        except StopIteration:
            return 'Dictionary not found', 404


class Sutta(Resource):
    @cache.cached(key_prefix=make_cache_key, timeout=600)
    def get(self, uid, author_uid=''):
        """
        Send Complete information set for sutta-view for given uid.
        ---
        parameters:
           - in: path
             name: author
             type: string
           - in: path
             name: uid
             type: string
           - in: query
             name: lang
             type: string
        responses:
            200:
                description: Complete information set for sutta-view
                schema:
                    id: sutta
                    type:  object
                    properties:
                        root_text:
                            type: object
                            properties:
                                uid:
                                    type: string
                                lang:
                                    type: string
                                is_root:
                                    type: boolean
                                title:
                                    type: string
                                author:
                                    type: string
                                author_uid:
                                    type: string
                                text:
                                    type: string
                        translation:
                            type: object
                            properties:
                                uid:
                                    type: string
                                lang:
                                    type: string
                                title:
                                    type: string
                                author:
                                    type: string
                                text:
                                    type: string
                        suttaplex:
                            $ref: '#/definitions/Suttaplex'
                        neighbours:
                            type: object
                            properties:
                                next:
                                    type: object
                                    properties:
                                        author:
                                            type: string
                                        title:
                                            type: string
                                        uid:
                                            type: string
                                previous:
                                    type: object
                                    properties:
                                        author:
                                            type: string
                                        title:
                                            type: string
                                        uid:
                                            type: string

        """
        lang = request.args.get('lang', 'en')

        db = get_db()

        results = db.aql.execute(SUTTA_VIEW,
                                 bind_vars={'uid': uid, 'language': lang, 'author_uid': author_uid})

        return results.next(), 200


class Currencies(Resource):
    @cache.cached(key_prefix=make_cache_key, timeout=600)
    def get(self):
        """
        Send list of available currencies.
        ---
        responses:
            200:
                schema:
                    id: currencies
                    type: array
                    items:
                        $ref '#/definitions/currency'
        definitions:
            currency:
                type: object
                properties:
                    american_express:
                        type: bool
                    name:
                        type: string
                    symbol:
                        type: string
        """
        db = get_db()

        language = request.args.get('language', current_app.config.get('DEFAULT_LANGUAGE'))

        data = db.aql.execute(CURRENCIES, bind_vars={'language': language})

        currencies = []
        default_currency_index: int = None

        DEFAULT_CURRENCY = 'USD'

        for i, x in enumerate(data):
            currencies.append(x)
            if x['symbol'] == DEFAULT_CURRENCY:
                default_currency_index = i

        response_data = {
            'default_currency_index': default_currency_index,
            'currencies': currencies
        }

        return response_data, 200


class Paragraphs(Resource):
    @cache.cached(key_prefix=make_cache_key, timeout=600)
    def get(self):
        """
        Send list of textual information paragraphs for the sutta view
        ---
        responses:
            200:
                schema:
                    id: paragraphs
                    type: array
                    items:
                        $ref: '#/definitions/paragraph'

        definitions:
            paragraph:
                type: object
                properties:
                    uid:
                        type: string
                    description:
                        type: string
        """
        db = get_db()

        data = db.aql.execute(PARAGRAPHS)

        return data.batch(), 200


class Glossary(Resource):
    @cache.cached(key_prefix=make_cache_key, timeout=600)
    def get(self):
        """
        Send list of glossary results for related terms in dictionary view
        ---
        responses:
            glossary:
                type: array
                properties:
                    word:
                        type: string
                    text:
                        type: string
        """
        db = get_db()

        data = db.aql.execute(GLOSSARY)

        return data.batch(), 200


class DictionaryAdjacent(Resource):
    @cache.cached(key_prefix=make_cache_key, timeout=600)
    def get(self, word=None):
        """
        Send list of adjacent terms to dictionary search word
        ---
        responses:
            glossary:
                type: array
                properties:
                    word:
                        type: string
        """
        db = get_db()

        data = db.aql.execute(DICTIONARY_ADJACENT, bind_vars={'word': word})

        return data.batch(), 200


class DictionarySimilar(Resource):
    @cache.cached(key_prefix=make_cache_key, timeout=600)
    def get(self, word=None):
        """
        Send list of similar terms to dictionary search word
        ---
        responses:
            glossary:
                type: array
                properties:
                    word:
                        type: string
        """
        db = get_db()

        data = db.aql.execute(DICTIONARY_SIMILAR, bind_vars={'word': word})

        return data.batch(), 200


class DictionaryFull(Resource):
    @cache.cached(key_prefix=make_cache_key, timeout=600)
    def get(self, word=None):
        """
        Sends list of dictionary entries to dictionary view
        ---
        responses:
            dictionary_full:
                type: array
                properties:
                    dictname:
                        type: string
                    word:
                        type: string
                    text:
                        type: string

        """
        if word is not None:
            word = word.lower()

        db = get_db()

        data = db.aql.execute(DICTIONARYFULL, bind_vars={'word': word})

        return data.batch(), 200


class Donations(Resource):
    def post(self):
        """
        Process the payment
        ---
        responses:
            all:
                description: Information massage.
                type: string
        """
        data = json.loads(list(request.form.keys())[0])
        currency = data.get('currency')
        inputted_amount = data.get('amount')
        one_time_donation = data.get('oneTimeDonation')
        monthly_donation = data.get('monthlyDonation')
        stripe_data = data.get('stripe')
        name = data.get('name')
        email_address = data.get('email')
        message = data.get('message')

        secret_key = os.environ.get('STRIPE_SECRET')

        stripe.api_key = secret_key
        db = get_db()
        try:
            currency = list(db['currencies'].find({'symbol': currency}))[0]
        except IndexError:
            return 'No such currency', 400

        if currency['decimal']:
            amount = inputted_amount * 100
        else:
            amount = inputted_amount

        customer_data = {
            'source': stripe_data['id']
        }

        if email_address:
            customer_data['email'] = email_address

        try:
            customer = stripe.Customer.create(**customer_data)
        except stripe.CardError:
            return {'err_code': 3}, 400
        try:
            if one_time_donation:
                charge = stripe.Charge.create(
                    customer=customer.id,
                    amount=amount,
                    currency=currency['symbol'],
                    metadata={"name": name, "message": message},
                    description=f'''Donation by {name if name else ""}, 
                                message {message if message else ""}'''
                )

            elif monthly_donation:
                plan = self._get_plan(amount, currency['symbol'])
                subscription = stripe.Subscription.create(
                    customer=customer.id,
                    items=[{"plan": plan.stripe_id}]
                )

            else:
                return {'err_message': 'Select either one time or monthly'}, 400

        except stripe.InvalidRequestError as e:
            code = 0
            if 'Amount must convert to at least 50 cents' in str(e):
                code = 1

            elif any(x in str(e) for x in ['99999999', '999,999.99', 'Invalid integer']):
                code = 2

            return {'err_code': code}, 400

        data = {
            'name': name,
            'amount': inputted_amount,
            'currency': currency['symbol'],
            'dateTime': datetime.datetime.now().strftime('%d-%m-%y %H:%M'),
            'subscription': monthly_donation
        }

        self.send_email(data, email_address)

        return data, 200

    @staticmethod
    def _get_plan(amount, currency):
        plan_id = f'monthly_{amount}_{currency}'
        try:
            plan = stripe.Plan.retrieve(plan_id)
        except stripe.error.InvalidRequestError:
            plan = stripe.Plan.create(
                amount=amount,
                interval='month',
                name='Monthly Donation to SuttaCentral',
                currency=currency,
                statement_descriptor='SuttaCentralDonation',
                id=plan_id)
        return plan

    @staticmethod
    @in_thread
    def send_async_mail(msg):
        from app import app
        with app.app_context():
            print('ATTEMPTING TO SEND AN EMAIL')
            mail.send(msg)
            print('EMAIL SENT')

    def send_email(self, data, email_address):
        msg = Message('Payment confirmation',
                      recipients=[email_address])
        msg.html = f'''
        Donation of <b>{data['amount']} {data['currency']}</b>.           
        {f"Made by <b>{data['name']}</b>." if data['name'] else ''}
        Made to SuttaCentral Development Trust, an educational charity For the purpose of supporting SuttaCentral.net<br>
        Payment service is Stripe.<br>
        <b>{data['dateTime']}</b>.<br>
        <b>{'Subscription' if data['subscription'] else 'One time donation'}</b>.           
        '''
        self.send_async_mail(msg)


class Images(Resource):
    @cache.cached(key_prefix=make_cache_key, timeout=600)
    def get(self, division, vol, page):
        """
        Send list of images for given division.
        ---
        responses:
            200:
                schema:
                    id: images
                    type: array
                    items:
                        type: object
                        properties:
                            name:
                                type: string
                            page:
                                type: number
        """
        db = get_db()

        data = db.aql.execute(IMAGES, bind_vars={'division': division, 'vol': vol, 'page': page})

        return data.batch(), 200


class Epigraphs(Resource):
    @cache.cached(key_prefix=make_cache_key, timeout=600)
    def get(self):
        """
        Send list of random epigraphs
        ---
        responses:
            200:
                schema:
                    id: epigraphs
                    type: array
                    items:
                        type: object
                        properties:
                            uid:
                                type: string
                            epigraph:
                                type: string
        """
        db = get_db()

        try:
            limit = int(request.args.get('limit', '10'))
        except ValueError:
            limit = 10

        data = db.aql.execute(EPIGRAPHS, bind_vars={'number': limit})

        return data.batch(), 200


class WhyWeRead(Resource):
    @cache.cached(key_prefix=make_cache_key, timeout=600)
    def get(self):
        """
        Send list of random why_we_read quotes.
        ---
        responses:
            200:
                schema:
                    id: why_we_read
                    type: array
                    items:
                        type: string
        """
        db = get_db()

        try:
            limit = int(request.args.get('limit', '10'))
        except ValueError:
            limit = 10

        data = db.aql.execute(WHY_WE_READ, bind_vars={'number': limit})

        return data.batch(), 200


class Expansion(Resource):
    @cache.cached(key_prefix=make_cache_key, timeout=600)
    def get(self):
        """
        Send list of uid expansion results to suttaplex view
        ---
        responses:
            expansion:
                type: array
                properties:
                    uid:
                        type: string
                    acro:
                        type: string
                    name:
                        type: string
        """
        db = get_db()

        data = db.aql.execute(EXPANSION)

        return data.batch(), 200


class CollectionUrlList(Resource):
    @cache.cached(key_prefix=make_cache_key, timeout=600)
    def get(self, collection=None):
        """
        Accept list of languages in format `?languages=lang1,lang2,...`
        ---
        parameters:
           - in: query
             name: languages
             type: string
             required: true
           - in: query
             name: include_root
             type: boolean
             required: false

        responses:
            200:
                type: object
                properties:
                    menu:
                        type: array
                        items:
                            type: string
                    suttaplex:
                        type: array
                        items:
                            type: string
                    texts:
                        type: array
                        items:
                            type: object
                            properties:
                                uid:
                                    type: string
                                translations:
                                    type: array
                                    items:
                                        type: object
                                        properties:
                                            lang:
                                                type: string
                                            authors:
                                                type: array
                                                items:
                                                    type: string
        """
        languages = request.args.get('languages', None)
        if languages is None:
            return 'Language not specified', 404

        root_lang = request.args.get('root_lang', 'false').lower()
        root_lang = {'true': True, 'false': False}[root_lang]
        languages = languages.split(',')

        menu_view = Menu()
        menu_data = menu_view.get_data(menu_query=PWA.MENU, bind_vars={'root_lang': root_lang, 'languages': languages})
        menu = []
        suttaplex = []
        texts = []
        for entry in menu_data:
            if entry['uid'].split('/')[1] == collection:
                menu_data = entry
                break
        if not collection or not isinstance(menu_data, dict):
            return 'collection not found', 404

        self.process_recursively(menu, suttaplex, texts, menu_data['children'])

        urls = {
            'menu': menu,
            'suttaplex': suttaplex,
            'texts': texts
        }
        return urls

    def process_recursively(self, menu, suttaplex, texts, data):
        for entry in data:
            if 'children' in entry:
                self.process_recursively(menu, suttaplex, texts, entry['children'])
            else:
                suttaplex.append(entry['id'])
                suttaplex.extend(entry['suttaplex'])
                texts.extend(entry['texts'])
                if entry['has_children']:
                    menu.append(entry['id'])
