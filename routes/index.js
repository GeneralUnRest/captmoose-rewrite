const express = require('express');

let router = express.Router();

router.get('/', (request, result) => {
    result.render('index', { title: 'Captain Moose' });
});

module.exports = router;
