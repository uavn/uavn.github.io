document.addEventListener('DOMContentLoaded', function() {
    Components.init();

    Widgets.init();
});

function closeModal(event) {
    event.target.closest('.window').remove();
}

function start() {
    alert('Start');
}

// App system
const Apps = {
    _openApp(iframeUrl, appTitle, width, height) {
        const templateElement = document.getElementById('window-tpl');

        if (!templateElement || templateElement.tagName !== 'TEMPLATE') {
            console.error('Window template element (#window-tpl) not found or is not a <template> tag.');
            return;
        }

        // Clone the template's content
        const clonedFragment = templateElement.content.cloneNode(true);

        // Find the main window element from the cloned fragment
        const windowEl = clonedFragment.querySelector('.window'); // This is the <div id="window-tpl" class="window">

        if (!windowEl) {
            console.error('#window-tpl element not found within the cloned template content.');
            return;
        }

        // windowEl.style.display = 'block';

        const windowBody = windowEl.querySelector('.window-body');

        if (!windowBody) {
            console.error('.window-body not found within the #window-tpl element.');

            return;
        }

        const appTitleEl = windowEl.querySelector('.window-header-title');

        if (appTitleEl) {
            appTitleEl.textContent = appTitle;
        }

        // Create the iframe
        const iframe = document.createElement('iframe');
        iframe.src = iframeUrl;
        iframe.style.border = 'none';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.setAttribute('title', appTitle);

        // Replace the {{content}} placeholder with the iframe
        windowBody.innerHTML = ''; // Clear "{{content}}"
        windowBody.appendChild(iframe);

        windowBody.style.width = width;//@TODO
        windowBody.style.height = height;//@TODO

        document.body.appendChild(windowEl);

        Components.init(windowEl);
    },
    OutOfGas() {
        Apps._openApp('./out-of-gas/index.html', 'Out Of Gas', 960, 600);
    },
    AboutMe() {
        Apps._openApp('./about.html', 'About Me', 300, 300);
    },
};

function openApp(appName) {
    if (Apps && typeof Apps[appName] === 'function') {
        Apps[appName]();
    } else {
        console.error(`App "${appName}" not found or is not a function.`);
        alert(`Error: App "${appName}" could not be loaded.`);
    }
}