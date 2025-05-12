Components = {
    init(parentElement) {
        parentElement = parentElement || document;

        console.log('parentElement', parentElement);

        this.replaceComponentWithTemplate(parentElement, 'wtf-button', 'wtf-button-tpl');
        this.replaceComponentWithTemplate(parentElement, 'wtf-icon', 'wtf-icon-tpl');
    },

    replaceComponentWithTemplate(parentElement, componentTag, templateId) {
        const template = document.getElementById(templateId);

        if (!template || template.tagName !== 'TEMPLATE') {
            console.error('Template not found.');

            return;
        }

        parentElement.querySelectorAll(componentTag).forEach(ph => {
            const clonedContent = template.content.firstElementChild.cloneNode(true);

            Object.entries(ph.dataset).forEach(([key, value]) => {
                if (['click'].includes(key)) {
                    clonedContent.addEventListener(key, function(event) {
                        event.preventDefault();

                        try {
                            new Function(value)();
                        } catch (e) {
                            console.error(`Error executing ${key} action "${value}":`, e);
                        }
                    });
                } else {
                    clonedContent.innerHTML = clonedContent.innerHTML.replace(`{{${key}}}`, value);
                }
            });

            ph.replaceWith(clonedContent);
        });
    },
};