/* Prism.js Autoloader Configuration for MarkRead */
(function() {
    if (window.Prism && window.Prism.plugins && window.Prism.plugins.autoloader) {
        // Configure the autoloader to fetch components from unpkg CDN
        Prism.plugins.autoloader.languages_path = 'https://unpkg.com/prismjs@1.29.0/components/';
    }
})();
