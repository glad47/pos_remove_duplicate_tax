{
    'name': 'pos_loyalty_polling',
    'version': '16.0.1.0.0',
    'category': 'Point of Sale',
    'author': "gladdema",
    'summary': 'Periodic loyalty updates for POS',
    'depends': ['point_of_sale'],
    'assets': {
        'point_of_sale.assets': [
            'pos_loyalty_polling/static/src/js/pos_loyalty_polling.js',
            'pos_loyalty_polling/static/src/js/db.js',
            'pos_loyalty_polling/static/src/js/models.js',
        ],
    },

    'installable': True,
    'application': False,
    'license': 'LGPL-3',
}