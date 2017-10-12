from common.arangodb import get_db
from migrations.base import Migration


class SecondMigration(Migration):
    migration_id = 'add_biblio_collection_008'
    tasks = ['create_collection']

    def create_collection(self):
        db = get_db()

        po_htmls = db.create_collection('biblio')
        po_htmls.add_hash_index(fields=['uid'], unique=True)
