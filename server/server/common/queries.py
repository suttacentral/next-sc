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
FOR pit IN pitaka
    SORT pit.num
    FOR group, group_edge, group_path IN OUTBOUND pit `root_edges`
        SORT group.num
        FILTER group_edge._to LIKE 'grouping/%'
        FOR v, e, p IN 0..''' + _MAX_NESTING_LEVEL + ''' OUTBOUND group `root_edges`
            FILTER e.type != 'text'
            LET lang_num = (
                FOR lang IN language
                    FILTER lang.iso_code == v.root_lang
                    LIMIT 1
                    RETURN lang.num
            )[0]
            RETURN {
                from: IS_NULL(e._from) ? {uid: group_edge._from, name: pit.name} : e._from,
                name: v.name,
                id: v._id,
                num: v.num
            }
'''


# Takes 2 bind_vars: `language` and `uid` of root element
SUTTAPLEX_LIST = '''
FOR v, e, p IN 0..6 OUTBOUND CONCAT('root/', @uid) `root_edges`
    LET legacy_translations = (
        FOR text IN html_text
            FILTER text.uid == v.uid
            LET res = {
                lang: text.lang,
                author: text.author,
                id: text._key,
                segmented: false
                }
            // Add title if it is in desired language
            LET res2 = (text.lang == @language) ? MERGE(res, {title: text.name}) : res 
            // Add volpage info if it exists.
            RETURN (text.volpage != null) ? MERGE(res2, {volpage: text.volpage}) : res
        )

    LET po_translations = (
        FOR text IN po_strings
            FILTER text.uid == v.uid
            SORT text.lang
            RETURN {
                lang: text.lang,
                author: text.author,
                id: text._key,
                segmented: true,
                title: text.title
            }
    )
    
    LET blurb = (
        FOR blurb IN blurbs
            FILTER blurb.uid == v.uid
            LIMIT 1
            RETURN blurb.blurb
            
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
        original_title: v.name,
        root_lang: v.root_lang,
        type: e.type ? e.type : v.type ? 'grouping' : 'text',
        from: e._from,
        translated_title: translated_titles,
        translations: filtered_translations,
        parallel_count: parallel_count,
        biblio: biblio
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
                id: text._key,
                segmented: false
                }
            // Add title if it is in desired language
            LET res2 = (text.lang == @language) ? MERGE(res, {title: text.name}) : res 
            // Add volpage info if it exists.
            RETURN (text.volpage != null) ? MERGE(res2, {volpage: text.volpage}) : res
        )

    LET po_translations = (
        FOR text IN po_strings
            FILTER text.uid == target.uid
            LET res = {
                lang: text.lang,
                author: text.author,
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
        
    RETURN {
        from: e.from,
        to: {
            to: e.to,
            volpages: v.volpage ? v.volpage : legacy_volpages,
            acronym: v.acronym,
            uid: v.uid,
            root_lang: v.root_lang,
            original_title: v.name,
            type: e.type,
            from: e._from,
            biblio: biblio,
            translations: FLATTEN([po_translations, legacy_translations])
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
_NEIGHBOURS_SUBQUERY = '''LET legacy = (
            FOR html IN html_text
                FILTER html.uid == uid.uid AND html.lang == @language
                SORT html.author
                RETURN KEEP(html, ['author', 'uid'])
            )
            
            LET same_author_legacy = (
                FOR text IN legacy
                    FILTER LOWER(text.author) == @author
                    LIMIT 1
                    RETURN KEEP(text, ['author', 'uid'])
            )[0]
            
            LET first_text_legacy = legacy[0]
            
            LET segmented = (
                FOR text IN po_strings
                    FILTER text.uid == uid.uid AND text.lang == @language
                    SORT text.author
                    RETURN KEEP(text, ['author', 'uid'])
            )
            
            LET first_text_segmented = segmented[0]
            
            LET same_author_segmented = (
                FOR text IN segmented
                    FILTER LOWER(text.author) == @author
                    LIMIT 1
                    RETURN KEEP(text, ['author', 'uid'])
            )[0]
            
            LET chosen = same_author_segmented ? same_author_segmented : 
                            first_text_segmented ? first_text_segmented : 
                            same_author_legacy ? same_author_legacy : 
                            first_text_legacy ? first_text_legacy : null
            
            FILTER chosen != null
            LIMIT 1
            RETURN chosen
'''


SUTTA_VIEW = '''
LET root_text = DOCUMENT(CONCAT('root/', @uid))

LET legacy_html = (
    FOR html IN html_text
        FILTER html.uid == @uid AND ((html.lang == @language AND LOWER(html.author) == @author) OR html.lang == root_text.root_lang)
        
        RETURN {
            uid: html.uid,
            lang: html.lang,
            is_root: html.lang == root_text.root_lang,
            title: html.name,
            author: html.author,
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
            author_blurb: object.author_blurb,
            lang: object.lang,
            strings: object.strings,
            title: object.title
        }
)[0]

LET translated_po_obj = (
    FOR object IN po_strings 
        FILTER object.uid == @uid AND object.lang == @language AND LOWER(object.author) == @author
        LIMIT 1 
        RETURN {
            uid: object.uid,
            author: object.author,
            author_blurb: object.author_blurb,
            lang: object.lang,
            strings: object.strings,
            title: object.title
        }
)[0]

LET neighbours = (
    LET current = (
        FOR text_division IN text_divisions
            FILTER text_division.uid == root_text.uid
            LIMIT 1
            RETURN KEEP(text_division, ['num', 'division'])
    )[0]
    
    LET next_uids = (
        FOR text_division IN text_divisions
            FILTER text_division.division == current.division AND text_division.num > current.num AND
                   (text_division.type == null OR text_division.type == 'subdivision')
            SORT text_division.num
            RETURN text_division.type == 'subdivision' ? null : KEEP(text_division, ['uid'])
    )

    LET previous_uids = (
        FOR text_division IN text_divisions
            FILTER text_division.division == current.division AND text_division.num < current.num AND
                   (text_division.type == null OR text_division.type == 'subdivision')
            SORT text_division.num DESC
            RETURN text_division.type == 'subdivision' ? null : KEEP(text_division, ['uid'])
    )
    
    LET next = (
        FOR uid IN next_uids
            ''' + _NEIGHBOURS_SUBQUERY + '''
    )[0]
    
    LET previous = (
        FOR uid IN previous_uids
            ''' + _NEIGHBOURS_SUBQUERY + '''
    )[0]
    
    RETURN {next: next, previous: previous}
)

LET suttaplex = (''' + SUTTAPLEX_LIST + ''')[0]
    
RETURN {
    root_text: translated_po_obj ? root_po_obj : null,
    translation: translated_po_obj ? (root_po_obj == translated_po_obj ? null : translated_po_obj) 
        : (FOR html IN legacy_html FILTER html.lang == @language LIMIT 1 RETURN html)[0],
    segmented: translated_po_obj ? true : false,
    markup: translated_po_obj ? markup : null,
    suttaplex: suttaplex,
    neighbours: neighbours
}
'''

CURRENCIES = '''
FOR currency IN currencies
    FILTER currency.use == true
    SORT currency.name
    RETURN KEEP(currency, ['name', 'symbol', 'american_express', 'decimal'])
'''

PARAGRAPHS = '''
FOR paragraph IN paragraphs
    RETURN {
        uid: paragraph.uid,
        description: paragraph.description
    }
'''
