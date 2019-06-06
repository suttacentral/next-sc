from pathlib import Path

from flask_script import Manager

from app import app
from common import arangodb
from migrations.runner import run_migrations

manager = Manager(app)


@manager.command
def migrate():
    print('Running migrations')
    run_migrations()
    print('DONE')


@manager.command
def list_routes():
    """
    Lists all available routes/URLs.
    """
    import urllib

    output = []
    for rule in app.url_map.iter_rules():

        options = {}
        for arg in rule.arguments:
            options[arg] = "[{0}]".format(arg)

        methods = ','.join(rule.methods)
        line = urllib.parse.unquote(
            "{:50s} {:20s} {}".format(rule.endpoint, methods, rule)
        )
        output.append(line)

    for line in sorted(output):
        print(line)


@manager.command
def load_data(no_pull=False):
    """
    Loads data from the data repo to database.
    """
    from data_loader.arangoload import run

    run(no_pull=no_pull)


@manager.command
def delete_db():
    arangodb.delete_db(arangodb.get_db())
    from flask import current_app

    storage_dir = current_app.config.get('STORAGE_DIR')
    for file_path in storage_dir.glob('.*'):
        file_path.unlink()


@manager.command
def index_elasticsearch():
    from search.texts import update

    update()


@manager.command
def generate_po_files():
    from internationalization import generate_pootle

    generate_pootle.run()


@manager.option('-p', '--path', default=None)
def load_po_files(path):
    from internationalization import load_pootle

    if path:
        load_pootle.GENERATED_PO_FILES_DIR = Path(path)
    load_pootle.run()


@manager.command
def calculate_download_sizes():
    from tools.calculate_download_size import run

    run()


if __name__ == '__main__':
    manager.run()
