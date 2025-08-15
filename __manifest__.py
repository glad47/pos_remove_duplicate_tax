{
    'name': 'pos_loyalty_polling',
    'version': '16.0.1.0.0',
    'category': 'Point of Sale',
    'author': "gladdema",
    'summary': 'Periodic loyalty updates for POS',
    'depends': ['point_of_sale'],
    # 'data': [
    #     'controllers/controllers.py',
    # ],
    'assets': {
        'point_of_sale.assets': [
            'pos_loyalty_polling/static/src/js/pos_loyalty_polling.js',
            'pos_loyalty_polling/static/src/js/pos_update_rewards.js',
            'pos_loyalty_polling/static/src/js/pos_update_orderline.js',
        ],
    },

    # 'data': [
    #     # 'views/views.xml',
    #     'views/templates.xml',
    # ],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}