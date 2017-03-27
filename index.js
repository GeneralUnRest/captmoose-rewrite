const express = require('express'),
      path = require('path');

let app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', require('./routes/index'));
app.get('/list', require('./routes/list'));

app.listen(8080, () => console.log('captmoose now running'));
