import { css, html, LitElement } from 'lit-element';
import { API_ROOT } from '../../constants';
import { typographyBilaraStyles } from '../styles/sc-typography-bilara-styles';

class SCFooter extends LitElement {
  static get properties() {
    return {
      translationTitle: {
        type: String,
      },
      translationSubtitle: {
        type: String,
      },
      translationLanguage: {
        type: String,
      },
      rootTitle: {
        type: String,
      },
      rootLanguage: {
        type: String,
      },
      authorName: {
        type: String,
      },
      translationDescription: {
        type: String,
      },
      translationProcess: {
        type: String,
      },
      textUID: {
        type: String,
      },
      sourceURL: {
        type: String,
      },
      publicationStatus: {
        type: String,
      },
      publicationNumber: {
        type: Number,
      },
      editionNumber: {
        type: Number,
      },
      publicationDate: {
        type: String,
      },
      publisher: {
        type: String,
      },
      editionURL: {
        type: String,
      },
      publicationType: {
        type: String,
      },
      numberOfVolumes: {
        type: String,
      },
      licenseType: {
        type: String,
      },
      licenseAbbreviation: {
        type: String,
      },
      licenseStatement: {
        type: String,
      },
      authorUID: {
        type: String,
      },
      isPublished: {
        type: Boolean,
      }
    };
  }

  static get styles() {
    return [
      typographyBilaraStyles,
      css`
        :host {
          display: flex;
          justify-content: center;
        }
        footer {
          max-width: 720px;
        }
      `,
    ];
  }


  constructor() {
    super();
    this.isPublished = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.fetchPublications(this.authorUID, this.textUID);
  }

  fetchPublications(authorUID, textUID) {
    const correctTextUID = textUID.slice(0, 2);
    const publicationURL = new URL(`${API_ROOT}/publication`);
    publicationURL.searchParams.append('author_id', authorUID);
    publicationURL.searchParams.append('text_uid', correctTextUID);
    fetch(publicationURL.toString())
      .then(r => r.json())
      .then(data => this.setPublicationInfo(data[0]))
      .catch(e => console.error(e));
  }

  setPublicationInfo(data) {
    if (data && data.is_published === 'true') {
      this.isPublished = true;
      this.translationTitle = data.translation_title;
      this.translationSubtitle = data.translation_subtitle;
      this.translationLanguage = data.translation_lang_name;
      this.rootTitle = data.root_title;
      this.rootLanguage = data.root_lang_name;
      this.authorName = data.author_name;
      this.translationDescription = data.translation_description;
      this.translationProcess = data.translation_process;
      this.sourceURL = data.source_url;
      this.publicationStatus = data.publication_status;
      this.publicationNumber = data.publication_number;
      this.editionNumber = this.getEditionAttribute(data, 'edition_number');
      this.publicationDate = this.getEditionAttribute(data, 'publication_date');
      this.publisher = this.getEditionAttribute(data, 'publisher');
      this.editionURL = this.getEditionAttribute(data, 'edition_url');
      this.publicationType = this.getEditionAttribute(data, 'publication_type');
      this.numberOfVolumes = data.number_of_volumes;
      this.licenseType = this.getLicenseAttribute(data, 'license_type');
      this.licenseAbbreviation = this.getLicenseAttribute(data, 'license_abbreviation');
      this.licenseStatement = this.getLicenseAttribute(data, 'license_statement');
    }
  }

  getEditionAttribute({ edition }, attribute) {
    return Array.isArray(edition) && edition[0] ? edition[0][attribute] : '';
  }

  getLicenseAttribute({license}, attribute) {
    return license ? license[attribute] : '';
  }

  render() {
    if (this.isPublished) return html`
      <footer>
        <h2>About this text</h2>
        <section class="text-metadata" about="${this.sourceURL}">
          <dl class="main-details">
            <dt class="translation-title">Translation title</dt>
            <dd class="translation-title" property="dc:title">${this.translationTitle}</dd>
            <dt class="translation-subtitle">Translation subtitle</dt>
            <dd class="translation-subtitle" property="dc:title">${this.translationSubtitle}</dd>
            <dt class="translation-language">Translation language</dt>
            <dd class="translation-language" property="dc:language">${this.translationLanguage}</dd>
            <dt class="root-title">Root title</dt>
            <dd class="root-title" property="dc:title">${this.rootTitle}</dd>
            <dt class="root-language">Root language</dt>
            <dd class="root-language">${this.rootLanguage}</dd>
            <dt class="author-name">Translator</dt>
            <dd class="author-name" property="dc:creator">${this.authorName}</dd>
          </dl>
          <dl class="descriptive-details">
            <dt class="translation-description">Translation description</dt>
            <dd class="translation-description" property="dc:description">
              ${this.translationDescription}
            </dd>
            <dt class="translation-process">Translation process</dt>
            <dd class="translation-process" property="dc:description">
              ${this.translationProcess}
            </dd>
          </dl>
          <dl class="metadata-details">
            <dt class="text-uid">Text identifier (UID)</dt>
            <dd class="text-uid" property="dc:identifier">${this.textUID}</dd>
            <dt class="source-url">Source</dt>
            <dd class="source-url">
              <a href="${this.sourceURL}" target="_blank">${this.sourceURL}</a>
            </dd>
            <dt class="publication-status">Publication status</dt>
            <dd class="publication-status">${this.publicationStatus}</dd>
            <dt class="publication-number">SuttaCentral publication number</dt>
            <dd class="publication-number" property="dc:identifier">${this.publicationNumber}</dd>
          </dl>
          <dl class="edition">
            <dt class="edition-number">Edition</dt>
            <dd class="edition-number">${this.editionNumber}</dd>
            <dt class="publication-date">Publication date</dt>
            <dd class="publication-date" property="dc:date">${this.publicationDate}</dd>
            <dt class="publisher">Publisher</dt>
            <dd class="publisher" property="dc:publisher">${this.publisher}</dd>
            <dt class="edition-url">URL</dt>
            <dd class="edition-url">${this.editionURL}</dd>
            <dt class="publication-type">Publication type</dt>
            <dd class="publication-type" property="dc:format">${this.publicationType}</dd>
            <dt class="number-of_volumes">Number of volumes</dt>
            <dd class="number-of_volumes">${this.numberOfVolumes}</dd>
          </dl>
        </section>
        <section class="license">
          <p class="license-type" property="dc:rights">
            ${this.licenseType}
            <span class="license-abbreviation">${this.licenseAbbreviation}</span>
          </p>
          <p class="creative-commons">
            <a rel="license" href="${this.license_url}">
              <img
                src="http://i.creativecommons.org/p/zero/1.0/88x31.png"
                style="border-style: none;"
                alt="CC0"
              />
            </a>
            <br />
            To the extent possible under law,
            <a rel="dct:publisher" href="https://suttacentral.net/">
              <span property="dct:title">${this.authorName}</span>
            </a>
            has waived all copyright and related or neighboring rights to
            <span property="dct:title">${this.translationTitle}</span>
            . This work is published from:
            <span
              property="vcard:Country"
              datatype="dct:ISO3166"
              content="AU"
              about="https://suttacentral.net/licensing"
            >
              Australia
            </span>
            .
          </p>
          <p class="license-statement">${this.licenseStatement}</p>
        </section>
      </footer>
    `;
  }
}

customElements.define('sc-footer', SCFooter);
