import os
from typing import Tuple

from flasgger import Swagger
from flask import Blueprint, Flask
from flask_cors import CORS
from flask_restful import Api

from common.arangodb import ArangoDB
from config import app_config, swagger_config, swagger_template
from api.views import Languages
from search.view import Search


def app_factory() -> Tuple[Api, Flask]:
    """app factory. Handles app object creation for better readability"""
    app = Flask(__name__)
    app.config.from_object(app_config[os.getenv('ENVIRONMENT')])
    api_bp = Blueprint('api', __name__)
    api = Api(api_bp)

    api.add_resource(Languages, '/languages')
    api.add_resource(Search, '/search')

    app.register_blueprint(api_bp)
    return api, app


api, app = app_factory()
arango = ArangoDB(app)
swagger = Swagger(app, config=swagger_config, template=swagger_template)
CORS(app)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
