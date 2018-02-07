import json

import lxml.html

from elasticsearch import ConnectionError
from flask import request, current_app
from flask_restful import Resource

from search import query as query_search
from collections import Counter


from common.arangodb import get_db

def cleanly_truncate_html(html_string, length):
    # TODO: The function name is aspirational, at the moment it crudely
    # butchers the HTML. Need to discuss further before choosing implementation.
    content = html_string
    if len(content) >= length:
        return content[:length] + '…'
    else:
        return content
    
def search(word, truncate_length=500):
    db = get_db()
    
    results = list(db.aql.execute('''
        FOR doc IN dictionary_full
            FILTER doc.word == @word OR doc.word_ascii == @word
            RETURN KEEP(doc, "dictname", "lang_to", "lang_from", "word", "word_ascii", "text")
    ''',
    bind_vars={'word': word}))
    
    if not results:
        return
    
    exact_results = [r for r in results if r['word'] == word]
    if exact_results:
        # simply discard inexact results if exact results exist
        results = exact_results
    else:
        # We could have multiple inexact results i.e. pali would match both
        # pāli and palī. We'll just use the word with the most
        # written about it.
        word_to_use = sorted(results, key=lambda r: len(r['text']))[-1]['word']
        results = [r for r in results if r['word'] == word_to_use]
    
    # We can have multiple hit: one per dictionary. We want to summarize them.
    gloss = None
    word = results[0]['word']
    best_text = ''
    for result in results:
        text = result['text']
        if result['dictname'] == 'gloss':
            gloss = text
        
        if len(text) > len(best_text):
            best_text = text
    
    content = cleanly_truncate_html(best_text, truncate_length)
    
    return {
        "heading": {
            "division": results[0]['dictname'],
            "subhead": [gloss] if gloss != best_text else [],
            "title": ""
        },
        "highlight": {
            "content": [content]
        },
        "url": f"/define/{word}",
        "category": "dictionary",
    }
        
        
                
            
            
            
    
        
    
    
