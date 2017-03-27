const GridPaint = require('gridpaint'),
      config = require('./config');

let painter = new GridPaint({
    width: config.moose.width,
    height: config.moose.height,
    cellWidth: 16,
    cellHeight: 24
});

function start() {
    let container = document.getElementById('moose-canvas'),
        tools = document.getElementById('moose-tools'),
        palette = document.getElementById('moose-palette');

    if (!container || !tools || !palette) {
        return alert('unable to load gridpainter');
    }

    let actions = [ 'pencil', 'bucket', 'undo', 'redo', 'clear', 'saveAs' ];
    actions.forEach((action, i) => {
        let button = document.createElement('a');
        button.classList.add('button');
        button.innerText = action;
        button.onclick = () => {
            if (i < 2) {
                painter.tool = action;
            } else {
                painter[action]();
            }
        };
        tools.appendChild(button);
    });

    container.appendChild(painter.dom);

    painter.palette.forEach((color, i) => {
        let button = document.createElement('button');
        button.style.backgroundColor = color;
        button.style.border = '1px solid #000';
        button.style.marginRight = '4px';
        button.style.color = 'white';
        button.innerText = '\xa0';
        button.title = 'switch to ' + color;
        button.onclick = () => painter.colour = i;
        palette.appendChild(button);
    });

    painter.init();
}

if (window.attachEvent) {
    window.attachEvent('onload', start);
} else {
    if (window.onload) {
        let curronload = window.onload;

        window.onload = (event) => {
            curronload(event);
            start();
        };
    } else {
        window.onload = start;
    }
}
