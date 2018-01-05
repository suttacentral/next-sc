import os
import json
import pprint

elementDirs = os.listdir('elements')


def process_file(element_name, file):
    file_data = json.load(file)
    output_file = open('prePootleFiles/{}'.format(element_name), 'w')
    output_data = json.dumps(file_data['en'], indent=4)
    output_file.write(output_data)


for directory in elementDirs:
    process_file(directory, open('elements/{}/en.json'.format(directory), 'r'))
