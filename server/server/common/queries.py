LANGUAGES = '''FOR l in language
                SORT l.name
                RETURN {"_rev": l._rev, "uid": l.uid, "name": l.name, "iso_code": l.iso_code}'''

TEXTS_BY_LANG = '''
FOR text IN html_text
        FILTER text.lang == @lang
        LET root_lang = (
            RETURN DOCUMENT(CONCAT('root/', text.uid)).root_lang
        )[0]
        RETURN {text: text.text, uid: text.uid, mtime: text.mtime, root_lang: root_lang}
'''

CURRENT_MTIMES = '''
FOR text IN html_text
    FILTER text.lang == @lang
    RETURN {uid: text.uid, mtime: text.mtime}
'''

_MAX_NESTING_LEVEL = '5'

MENU = '''
FOR div IN root
    FILTER div.type == 'division'
    LET parents = MERGE(
        FOR p, p_edge, p_path IN 1..1 INBOUND div `root_edges`
            RETURN {
                [p.type]: {
                    name: p.name,
                    uid: p._id,
                    num: p.num
                }
            }
        )
    LET descendant = (
        FOR d, d_edge, d_path IN 1..1 OUTBOUND div `root_edges`
            FILTER d_edge.type != 'text'
            LIMIT 1
            RETURN d.uid
    )[0]
    LET name = DOCUMENT(CONCAT('root_names/', div.uid, '_', @language))['name']
    RETURN {
        uid: div._id, 
        has_children: descendant != null,
        name: name ? name : DOCUMENT(CONCAT('root_names/', div.uid, '_', div.root_lang))['name'],
        lang_iso: div.root_lang,
        lang_name: (FOR lang in language FILTER lang.uid == div.root_lang LIMIT 1 RETURN lang.name)[0],
        num: div.num, 
        id: div.uid, 
        type: div.type, 
        parents: parents
    }
'''

SUBMENU = '''
LET div = DOCUMENT('root', @submenu_id)
LET descendents = (
    FOR d, d_edge, d_path IN 1..100 OUTBOUND div `root_edges`
        FILTER d_edge.type != 'text' OR LENGTH(d_path.vertices) <= 2
        LET name = DOCUMENT(CONCAT('root_names/', d.uid, '_', @language))['name']
        RETURN {
            from: d_edge._from,
            name: name ? name : DOCUMENT(CONCAT('root_names/', d.uid, '_', d.root_lang))['name'],
            uid: d._id,
            num: d.num,
            type: d.type,
            id: d.uid
    }
)
LET parents = MERGE(
    FOR p, p_edge, p_path IN 1..1 INBOUND div `root_edges`
        RETURN {
            [p.type]: {
                name: p.name,
                uid: p._id,
                num: p.num,
                type: p.type
        }
    }
)

RETURN {name: div.name, num: div.num, id: div.uid, uid: div._id, descendents: descendents, parents: parents}
'''

# Takes 2 bind_vars: `language` and `uid` of root element
SUTTAPLEX_LIST = '''
FOR v, e, p IN 0..6 OUTBOUND CONCAT('root/', @uid) `root_edges`
    LET legacy_translations = (
        FOR text IN html_text
            FILTER text.uid == v.uid
            LET res = {
                lang: text.lang,
                lang_name: (FOR lang in language FILTER lang.uid == text.lang LIMIT 1 RETURN lang.name)[0],
                author: text.author,
                author_short: text.author_short,
                author_uid: text.author_uid,
                id: text._key,
                segmented: false
                }
            // Add title if it is in desired language
            LET res2 = (text.lang == @language) ? MERGE(res, {title: text.name}) : res 
            // Add volpage info if it exists.
            RETURN (text.volpage != null) ? MERGE(res2, {volpage: text.volpage}) : res2
        )

    LET po_translations = (
        FOR text IN po_strings
            FILTER text.uid == v.uid
            SORT text.lang
            RETURN {
                lang: text.lang,
                lang_name: (FOR lang in language FILTER lang.uid == text.lang LIMIT 1 RETURN lang.name)[0],
                author: text.author,
                author_short: text.author_short,
                author_uid: text.author_uid,
                id: text._key,
                segmented: true,
                title: text.title
            }
    )
    
    LET blurbs_by_uid = (
        FOR blurb IN blurbs
            FILTER blurb.uid == v.uid AND (blurb.lang == @language OR blurb.lang == 'en')
            LIMIT 2
            RETURN blurb
    )
    LET blurb = (
         RETURN LENGTH(blurbs_by_uid) == 2 ? 
             (FOR blurb IN blurbs_by_uid FILTER blurb.lang == @language RETURN blurb.blurb)[0] : 
             blurbs_by_uid[0].blurb
    )[0]
    
    LET legacy_volpages = (
        FOR text IN legacy_translations
            FILTER HAS(text, "volpage")
            RETURN text.volpage
    )
    
    LET difficulty = (
        FOR difficulty IN difficulties
            FILTER difficulty.uid == v.uid
            LIMIT 1
            RETURN difficulty.difficulty
    )[0]
    
    LET translations = FLATTEN([po_translations, legacy_translations])
    
    LET is_segmented_original = (
        FOR translation IN translations
            FILTER translation.lang == v.root_lang AND translation.segmented == true
            LIMIT 1
            RETURN true
    )[0]

    LET filtered_translations = (
        FOR translation IN translations
            FILTER translation.lang != v.root_lang OR translation.segmented == true OR is_segmented_original == null
            RETURN translation
    )
    
    LET translated_titles = (
        FOR translation IN translations
            FILTER translation.lang == @language AND HAS(translation, 'title')
            LIMIT 1
            RETURN translation.title
    )[0]
    
    LET parallel_count = LENGTH(
        FOR rel IN relationship
            FILTER rel._from == v._id
            RETURN rel
    )
    
    LET biblio = (
        FOR biblio IN biblios
            FILTER biblio.uid == v.biblio_uid
            LIMIT 1
            RETURN biblio.text
    )[0]
        
    RETURN {
        acronym: v.acronym,
        volpages: v.volpage ? v.volpage : legacy_volpages[0],
        uid: v.uid,
        blurb: blurb,
        difficulty: difficulty,
        original_title: DOCUMENT(CONCAT('root_names/', v.uid, '_', v.lang)).name,
        root_lang: v.root_lang,
        type: e.type ? e.type : (v.type ? v.type : 'text'),
        from: e._from,
        translated_title: translated_titles,
        translations: filtered_translations,
        parallel_count: parallel_count,
        biblio: biblio,
        num: v.num
    }
'''

PARALLELS = '''
FOR v, e, p IN OUTBOUND DOCUMENT(CONCAT('root/', @uid)) `relationship`
    LET target = DOCUMENT(e._to)
    
    LET legacy_translations = (
        FOR text IN html_text
            FILTER text.uid == target.uid
            LET res = {
                lang: text.lang,
                author: text.author,
                author_short: text.author_short,
                author_uid: text.author_uid,
                id: text._key,
                segmented: false
                }
            // Add title if it is in desired language
            LET res2 = (text.lang == @language) ? MERGE(res, {title: text.name}) : res 
            // Add volpage info if it exists.
            RETURN (text.volpage != null) ? MERGE(res2, {volpage: text.volpage}) : res2
        )

    LET po_translations = (
        FOR text IN po_strings
            FILTER text.uid == target.uid
            LET res = {
                lang: text.lang,
                author: text.author,
                author_short: text.author_short,
                author_uid: text.author_uid,
                id: text._key,
                segmented: true
            }
            //Text.strings[1][1] is a temporary hack, we have to wait for Blake to finish data manipulation.
            RETURN (text.lang == @language) ? MERGE(res, {title: text.strings[1][1]}) : res
    )
    
    LET legacy_volpages = (
        FOR text IN legacy_translations
            FILTER HAS(text, "volpage")
            RETURN text.volpage
    )[0]
    
    SORT e.resembling
    
    LET biblio = (
        FOR biblio IN biblios
            FILTER biblio.uid == v.biblio_uid
            LIMIT 1
            RETURN biblio.text
    )[0]

    LET translations = FLATTEN([po_translations, legacy_translations])

    LET translated_titles = (
        FOR translation IN translations
            FILTER translation.lang == @language AND HAS(translation, 'title')
            LIMIT 1
            RETURN translation.title
    )[0]

    LET original_titles = (
        FOR original_name IN root_names
            FILTER original_name.uid == v.uid
            LIMIT 1
            RETURN original_name.name
    )[0]

    RETURN {
        from: e.from,
        to: {
            to: e.to,
            volpages: v.volpage ? v.volpage : legacy_volpages,
            acronym: v.acronym,
            uid: v.uid,
            root_lang: v.root_lang,
            original_title: original_titles,
            translated_title: translated_titles,
            type: e.type,
            from: e._from,
            biblio: biblio,
            translations: translations
        },
        type: e.type,
        remark: e.remark,
        resembling: e.resembling
    }
'''

# Takes 2 bind_vars: `from` and `to`.
DICTIONARIES = '''
FOR dict IN dictionaries
    FILTER dict.from == @from AND dict.to == @to AND dict.lookup == true AND dict.main == @main
    LIMIT 1
    RETURN {
        from: dict.from,
        to: dict.to,
        dictionary: dict.dictionary
    }
'''

# Takes 3 bind_vars: `language`, `uid` and `author`
_NEIGHBOURS_SUBQUERY = '''
LET legacy = (
    FOR html IN html_text
        FILTER html.uid == uid AND html.lang == @language
        SORT html.author_uid
        RETURN MERGE(KEEP(html, ['author_uid', 'uid']), {'title': html.name})
    )
    
    LET same_author_legacy = (
        FOR text IN legacy
            FILTER LOWER(text.author_uid) == @author_uid
            LIMIT 1
            RETURN text
    )[0]
    
    LET first_text_legacy = legacy[0]
    
    LET segmented = (
        FOR text IN po_strings
            FILTER text.uid == uid.uid AND text.lang == @language
            SORT text.author_uid
            RETURN KEEP(text, ['author_uid', 'uid', 'title'])
    )
    
    LET first_text_segmented = segmented[0]
    
    LET same_author_segmented = (
        FOR text IN segmented
            FILTER LOWER(text.author_uid) == @author_uid
            LIMIT 1
            RETURN text
    )[0]
    
    LET chosen = same_author_segmented ? same_author_segmented : 
                    first_text_segmented ? first_text_segmented : 
                    same_author_legacy ? same_author_legacy : 
                    first_text_legacy ? first_text_legacy : null
    
    FILTER chosen != null
    LIMIT 2
    LET additional_info = KEEP(DOCUMENT(CONCAT('root/', chosen.uid)), ['name', 'acronym'])
    RETURN MERGE(chosen, {original_title: additional_info.name, acronym: additional_info.acronym})
'''

SUTTA_VIEW = '''
LET root_text = DOCUMENT(CONCAT('root/', @uid))

LET legacy_html = (
    FOR html IN html_text
        FILTER html.uid == @uid AND ((html.lang == @language AND LOWER(html.author_uid) == @author_uid) OR html.lang == root_text.root_lang)
        
        RETURN {
            uid: html.uid,
            lang: html.lang,
            is_root: html.lang == root_text.root_lang,
            title: html.name,
            author: html.author,
            author_short: html.author_short,
            author_uid: html.author_uid,
            text: html.text
        }
)

LET markup = (
    FOR markup IN po_markup
        FILTER markup.uid == @uid
        LIMIT 1
        RETURN markup.markup
)[0]

LET root_po_obj = (
    FOR object IN po_strings
        FILTER object.uid == @uid AND object.lang == root_text.root_lang
        LIMIT 1 
        RETURN {
            uid: object.uid,
            author: object.author,
            author_short: object.author_short,
            author_uid: object.author_uid,
            author_blurb: object.author_blurb,
            lang: object.lang,
            strings: object.strings,
            title: object.title
        }
)[0]

LET translated_po_obj = (
    FOR object IN po_strings 
        FILTER object.uid == @uid AND object.lang == @language AND object.author_uid == @author_uid
        LIMIT 1 
        RETURN {
            uid: object.uid,
            author: object.author,
            author_short: object.author_short,
            author_uid: object.author_uid,
            author_blurb: object.author_blurb,
            lang: object.lang,
            strings: object.strings,
            title: object.title
        }
)[0]

LET neighbours = (
    LET current = (
        FOR text_division IN text_divisions
            FILTER LIKE(text_division.uid, CONCAT('%', root_text.uid))
            LIMIT 1
            RETURN KEEP(text_division, ['num', 'division'])
    )[0]
    
    LET next_uids = (
        FOR text_division IN text_divisions
            FILTER text_division.division == current.division AND text_division.num > current.num
                   AND text_division.type == 'text'
            SORT text_division.num
            RETURN LAST(SPLIT(text_division.uid, '/'))
    )

    LET previous_uids = (
        FOR text_division IN text_divisions
            FILTER text_division.division == current.division AND text_division.num < current.num
                   AND text_division.type == 'text'
            SORT text_division.num DESC
            RETURN LAST(SPLIT(text_division.uid, '/'))
    )
    
    LET next = (
        FOR uid IN next_uids
            ''' + _NEIGHBOURS_SUBQUERY + '''
    )
    
    LET previous = (
        FOR uid IN previous_uids
            ''' + _NEIGHBOURS_SUBQUERY + '''
    )
    
    RETURN {next: next, previous: previous}
)[0]

LET suttaplex = (''' + SUTTAPLEX_LIST + ''')[0]
    
RETURN {
    neighbours: neighbours,
    root_text: translated_po_obj ? root_po_obj : null,
    translation: translated_po_obj ? (root_po_obj == translated_po_obj ? null : translated_po_obj) 
        : (FOR html IN legacy_html FILTER html.lang == @language LIMIT 1 RETURN html)[0],
    segmented: translated_po_obj ? true : false,
    markup: translated_po_obj ? markup : null,
    suttaplex: suttaplex
}
'''

CURRENCIES = '''
FOR currency IN currencies
    FILTER currency.use == true
    LET expected_name = DOCUMENT(CONCAT('currency_names/', currency.symbol, '_', @language)).name
    LET name = expected_name ? expected_name : DOCUMENT(CONCAT('currency_names/', currency.symbol, '_', 'en')).name
    SORT name
    RETURN {
        name: name,
        symbol: currency.symbol,
        american_express: currency.american_express,
        decimal: currency.decimal
    }
'''

PARAGRAPHS = '''
FOR paragraph IN paragraphs
    RETURN {
        uid: paragraph.uid,
        description: paragraph.description
    }
'''

DICTIONARYFULL = '''
FOR dictionary IN dictionary_full
    FILTER dictionary.word == @word
    RETURN {
        dictname: dictionary.dictname,
        text: dictionary.text
    }
'''

IMAGES = '''
FOR image IN images
    FILTER image.division == @division AND image.vol == @vol
    SORT image.page
    RETURN {name: image.name,
            pageNumber: image.page_number}
'''

EPIGRAPHS = '''
FOR epigraph IN epigraphs
    SORT RAND()
    LIMIT @number
    RETURN KEEP(epigraph, ['uid', 'epigraph'])
'''

WHY_WE_READ = '''
FOR text IN why_we_read
    SORT RAND()
    LIMIT @number
    RETURN text.text
'''

GLOSSARY = '''
LET glossary_item = (
    FOR dictionary IN dictionary_full
        FILTER dictionary.dictname == "gloss"
        RETURN { [ dictionary.word ]: dictionary.text }
    )
    
RETURN MERGE(glossary_item)
'''

DICTIONARY_ADJACENT = '''
LET word_number = (
    FOR dictionary IN dictionary_full
        FILTER dictionary.word == @word
        LIMIT 1
        RETURN dictionary.num
    )

LET adjacent_words = (
    FOR selected IN dictionary_full
        FILTER selected.num < word_number+6
        FILTER selected.num > word_number-6
        SORT selected.num
        RETURN selected.word
    )
    
RETURN UNIQUE(adjacent_words)
'''

DICTIONARY_SIMILAR = '''
LET similar_words = (
    FOR dictionary IN dictionary_full
        FILTER dictionary.word == @word
        LIMIT 1
        RETURN dictionary.similar
    )[0]
    
RETURN similar_words
'''

EXPANSION = '''
LET expansion_item = (
    FOR entry IN uid_expansion
        RETURN { [ entry.uid ]: [ entry.acro, entry.name ] }
    )
    
RETURN MERGE(expansion_item)
'''
