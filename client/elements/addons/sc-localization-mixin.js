import { connect } from 'pwa-helpers';
import { store } from '../../redux-store';

const FALLBACK_LANGUAGE = 'en';

// I don't want to make call for /api/languages
// because it would block the rendering
const SUPPORTED_TRANSLATIONS = ['en', 'pl', 'pt', 'zh'];

const localizationCache = {};

// eslint-disable-next-line import/prefer-default-export
export const LitLocalized = base =>
  class extends connect(store)(base) {
    static get properties() {
      return {
        language: { type: String },
        localizedStringsPath: { type: String },
        _languageLoaded: { type: Boolean },
      };
    }

    constructor() {
      super();
      this.__resources = {};
    }

    shouldUpdate() {
      return this._languageLoaded;
    }

    localize(key, params) {
      const string = this.__resources && this.__resources[key] ? this.__resources[key] : '';

      if (!string && this._languageLoaded) {
        // console.warn('missing translation key', key);
      }

      if (params) {
        return string.replace(/\{([a-z][a-z0-9-]*)\}/gi, (match, group) =>
          undefined !== params[group] ? params[group] : group
        );
      }

      return string || key;
    }

    localizeEx(key, ...params) {
      const string = this.__resources && this.__resources[key] ? this.__resources[key] : '';

      if (!string && this._languageLoaded) {
        // console.warn('missing translation key', key);
      }

      if (params.length) {
        return string.replace(/\{([a-z][a-z0-9-]*)\}/gi, (match, group) =>
          undefined !== params[params.indexOf(group) + 1]
            ? params[params.indexOf(group) + 1]
            : group
        );
      }

      return string || key;
    }

    stateChanged(state) {
      if (this.language !== state.siteLanguage) {
        this.language = state.siteLanguage;
        this.fullSiteLanguageName = state.fullSiteLanguageName;
        this.__siteLanguageChanged(this.language);
      }
    }

    async __siteLanguageChanged(lang) {
      this._languageLoaded = false;
      this.__resources = {
        ...(await this.__loadLanguage(FALLBACK_LANGUAGE)),
        ...(await this.__loadLanguage(lang)),
      };
      this._languageLoaded = true;
    }

    async __loadLanguage(lang) {
      if (SUPPORTED_TRANSLATIONS.includes(lang)) {
        if (!this.localizedStringsPath) {
          return;
        }
        const path = `${this.localizedStringsPath}/${lang}.json`;

        if (path in localizationCache) {
          return localizationCache[path];
        }

        localizationCache[path] = fetch(path)
          .then(r => r.json())
          .then(data => data[lang])
          .catch(() => ({}));

        return localizationCache[path];
      }
      return Promise.resolve({});
    }

    loadFallbackLanguage() {
      this.__siteLanguageChanged(FALLBACK_LANGUAGE);
    }
  };
