{
    'name': 'pos_remove_duplicate_tax',
    'version': '16.0.1.0.0',
    'category': 'Point of Sale',
    'author': "gladdema",
    'summary': 'Remove irrelevant taxes from each orderline in the POS.',
    'depends': ['point_of_sale'],
    'assets': {
        'point_of_sale.assets': [
            'pos_remove_duplicate_tax/static/src/js/remove_duplicate.js',
        ],
    },
    'installable': True,
    'application': False,
    'license': 'LGPL-3',
}