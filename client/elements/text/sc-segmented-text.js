import { html } from '@polymer/polymer/polymer-element.js';
import '@polymer/polymer/polymer-element.js';
import '@polymer/paper-tooltip/paper-tooltip.js';
import '@polymer/paper-spinner/paper-spinner-lite.js';
import '@polymer/paper-toast/paper-toast.js';
import '@polymer/iron-icon/iron-icon.js';

import '../addons/sc-nav-contents';
import { SCTextPage } from "./sc-text-page.js";
import './sc-text-options.js';
import { textStyles } from '../styles/sc-text-styles.js';
import { textHeadingStyles } from '../styles/sc-text-heading-styles.js';
import { textParagraphNumStyles } from '../styles/sc-text-paragraph-num-styles.js';
import { lookupStyles } from '../lookups/sc-lookup-styles.js';
import '../lookups/sc-pli.js';
import '../lookups/sc-lzh2en.js';
import { Transliterator } from './transliterator.js';

const polymer_lookupStyles = html([lookupStyles.strings.join('')]);
const polymer_textHeadingStyles = html([textHeadingStyles.strings.join('')]);
const polymer_textStyles = html([textStyles.strings.join('')]);
const polymer_textParagraphNumStyles = html([textParagraphNumStyles.strings.join('')]);

class SCSegmentedText extends SCTextPage {
  static get template() {
    return html`
    ${polymer_textStyles}
    ${polymer_textHeadingStyles}
    ${polymer_textParagraphNumStyles}
    ${polymer_lookupStyles}
    <style>
      :host {
        --iron-icon-fill-color: var(--sc-disabled-text-color);
        --iron-icon-height: calc(var(--sc-size-sm) * 1.5);
        --iron-icon-width: calc(var(--sc-size-sm) * 1.5);
      }

      .image-link {
        cursor: pointer;
      }

      .image-book-link {
        margin-bottom: .5em;
        margin-left: .2em;
      }

      .image-book-link:before {
        display: none;
      }

      .text-center {
        text-align: center;
      }

      .margin-top-xl {
        margin-top: 10vh;
      }

      .loading-indicator {
        @apply --sc-skolar-font-size-s;
        text-align: center;
        height: 60px;
      }

      .highlight-wrapper {
        display: block;
      }

      .disabled-highlight-wrapper {
        display: block;
      }

      .highlight,
      .highlight-wrapper-highlighted {
        background-color: var(--sc-disabled-text-color-opaque);
      }

      article p,
      .word,
      .translated-text,
      .original-text {
        transition: background-color 300ms ease-in;
      }

      p, li {
        hanging-punctuation: first last;
      }
    </style>

    <div class="loading-indicator" hidden$="[[!_shouldShowLoadingIndicator(error, isLoading, isTextViewHidden)]]">
      <paper-spinner-lite active="[[isLoading]]"></paper-spinner-lite>
    </div>

    <iron-a11y-keys id="a11y" keys="alt+m" on-keys-pressed="deathToTheBeast"></iron-a11y-keys>

    <sc-nav-contents items="[[navItems]]"></sc-nav-contents>

    <div id="segmented_text_content" class="html-text-content" inner-h-t-m-l="[[markup]]" hidden$="[[isTextViewHidden]]"></div>

    <template is="dom-if" if="[[_shouldShowError(rootSutta, translatedSutta)]]">
      <div class="text-center margin-top-xl">
        <h2>{{ localize('error404') }}</h2>
        <h3>{{ localize('couldNotFind') }}</h3>
      </div>
    </template>

    <sc-pali-lookup id="pali_lookup"></sc-pali-lookup>
    <sc-chinese-lookup id="chinese_lookup"></sc-chinese-lookup>`;
  }

  static get properties() {
    return {
      navItems: {
        type: Array,
        value: [],
      },
      rootSutta: {
        type: Object
      },
      translatedSutta: {
        type: Object
      },
      // If true, shows the paragraph numbers on the right of the text.
      showParagraphs: {
        type: Boolean,
        statePath: 'textOptions.paragraphsEnabled',
        observer: '_computeParagraphs'
      },
      paragraphs: {
        type: Array,
        statePath: 'textOptions.paragraphDescriptions'
      },
      paragraphTitles: {
        type: Object
      },
      rootAuthor: {
        type: String
      },
      rootLang: {
        type: String
      },
      rootTitle: {
        type: String
      },
      translationAuthor: {
        type: String
      },
      translationLang: {
        type: String
      },
      translatedTitle: {
        type: String
      },
      isLoading: {
        type: Boolean,
        observer: '_loadingChanged'
      },
      error: {
        type: Object
      },
      isTextViewHidden: {
        type: Boolean,
        value: false
      },
      hidden: {
        type: Boolean
      },
      chosenTextView: {
        type: String,
        statePath: 'textOptions.segmentedSuttaTextView',
        observer: '_setViewOptions'
      },
      paliScript: {
        type: String,
        statePath: 'textOptions.script',
        observer: '_changeScript'
      },
      markup: {
        type: String,
        observer: '_updateView'
      },
      isPaliLookupEnabled: {
        type: Boolean,
        statePath: 'textOptions.paliLookupActivated',
        observer: '_paliLookupStateChanged'
      },
      tooltipCount: {
        type: Number,
        value: 0
      },
      spansForWordsGenerated: {
        type: Boolean,
        value: false
      },
      spansForGraphsGenerated: {
        type: Boolean,
        value: false
      },
      isChineseLookupEnabled: {
        type: Boolean,
        statePath: 'textOptions.chineseLookupActivated',
        observer: '_chineseLookupStateChanged'
      },
      scriptIsoCodes: {
        type: Object,
        value: {
          'latin': 'Latn',
          'sinhala': 'Sinh',
          'devanagari': 'Deva',
          'thai': 'Thai',
          'myanmar': 'Mymr'
        }
      },
      segmentedIDsAdded: {
        type: Boolean,
        value: false
      },
      hasScriptBeenChanged: {
        type: Boolean,
        value: false
      },
      localizedStringsPath: {
        type: String,
        value: '/localization/elements/sc-text'
      },
      currentId: {
        type: String,
        value: ''
      },
      inputElement: {
        type: Object
      }
    }
  }

  static get actions() {
    return {
      changeSuttaMetaText(metaText) {
        return {
          type: 'CHANGE_SUTTA_META_TEXT',
          metaText: metaText
        }
      },
      chooseSegmentedSuttaTextView(viewNumber) {
        return {
          type: 'CHOOSE_SEGMENTED_SUTTA_TEXT_VIEW',
          view: viewNumber
        }
      }
    }
  }

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('click', () => {
      requestAnimationFrame(() => {
        this._scrollToSection(window.location.hash.substr(1), false, 0);
      });
    });
    window.addEventListener('hashchange', () => {
      requestAnimationFrame(() => {
        this._scrollToSection(window.location.hash.substr(1), true, 0);
      });
    });
    // Scroll to the section after the hash sign in the url:
    setTimeout(() => {
      this._scrollToSection(window.location.hash.substr(1), false, 500);
    });
    this.inputElement = this.$.segmented_text_content;
    this.$.a11y.target = document.querySelector('body');
    // Add segmented textual information paragraphs if not added already
    if (!this.segmentedIDsAdded) {
      this._addSegmentedTextualInfoElements();
    }
    this._scrollToSectionInUrl();

    this.navItems = this._prepareNavigation();
    const elementHgroup = this.shadowRoot.querySelector(".hgroup");
    const elementNav = this.shadowRoot.querySelector('sc-nav-contents');
    elementHgroup.appendChild(elementNav);
  }

  _updateView() {
    if (!this.markup) {
      return;
    }
    this.currentId = '';
    this._resetViewOptions();
    this._setRootAttributes();
    this._setTranslatedAttributes();
    this._addTextContent();
    if (!this._browserRequiresShadyDomFix()) {
      this._computeParagraphs();
    }
    this.dispatch('changeSuttaMetaText', this._computeMeta());

    this.navItems = this._prepareNavigation();
  }

  _addTextContent() {
    this._applyFirefoxShadyDomFix();
    if (this.translatedSutta) {
      this._addPrimaryText(this.translatedSutta.strings);
      if (this.translatedSutta.lang === 'pli' || this.translatedSutta.lang === 'lzh') {
        this._putIntoSpans('.translated-text', this.rootSutta.lang);
      }
    } else {
      this._addPrimaryText(this.rootSutta.strings);
      if (this.rootSutta.lang === 'pli' || this.rootSutta.lang === 'lzh') {
        this._putIntoSpans('.translated-text', this.rootSutta.lang);
      }
    }
  }

  _setRootAttributes() {
    if (!this.rootSutta) {
      this.rootAuthor = this.rootLang = this.rootTitle = null;
      return;
    }
    this.rootAuthor = this.rootSutta.author;
    this.rootLang = this.rootSutta.lang;
    this.rootTitle = this.rootSutta.title;
  }

  _setTranslatedAttributes() {
    if (!this.translatedSutta) {
      this.translationAuthor = this.translationLang = this.translatedTitle = null;
      return;
    }
    this.translationAuthor = this.translatedSutta.author;
    this.translationLang = this.translatedSutta.lang;
    this.translatedTitle = this.translatedSutta.title;
  }

  // returns the meta-data from the loaded sutta text
  _computeMeta() {
    if (this.translatedSutta && this.translatedSutta.author_blurb) {
      return this.translatedSutta.author_blurb[this.translationLang] || this.localize('noMetadata');
    } else if (this.rootSutta && this.rootSutta.author_blurb) {
      return this.rootSutta.author_blurb[Object.keys(this.rootSutta.author_blurb)[0]]
    } else {
      return this.localize('noMetadata');
    }
  }

  // if the base html and the pali texts have been fully loaded, the setting from the
  // settings-menu for the relevant view is implemented by adding relevant class
  // or by adding a paper-tooltip and populating this with the pali text in the chosen script.
  _setViewOptions() {
    if (!this.markup || !this.translatedSutta) {
      return;
    }
    this._removeHighlights();
    this._disableHighlightWrappers();
    const textContent = this.$.segmented_text_content;
    this._resetViewOptions();
    switch (this.chosenTextView) {
      case 'sidebyside':
        textContent.classList.add('side-by-side');
        this._showComplexView();
        break;
      case 'linebyline':
        textContent.classList.add('line-by-line');
        this._showComplexView();
        break;
      case 'popup':
        textContent.classList.add('popup');
        this._addPopupTooltips(textContent);
        break;
    }
  }

  // Sets options for displaying the side-by-side and line-by-line segmented views ('complex views').
  _showComplexView() {
    requestAnimationFrame(() => {
      this._addSecondaryText();
      this._changeScript(this.paliScript);
      this._toggleSegmentedTextualInfo(true);
    });
  }

  // reset all classes and remove tooltips.
  _resetViewOptions() {
    this.$.segmented_text_content.classList.remove('side-by-side', 'line-by-line', 'popup', 'show-pali');
    Array.from(this.shadowRoot.querySelectorAll('paper-tooltip')).forEach(item =>
      item.parentNode.removeChild(item)
    );
    Array.from(this.shadowRoot.querySelectorAll('.translated-text')).forEach(item =>
      item.classList.remove('highlightable-segment')
    );
    if (this.translatedSutta) {
      Array.from(this.shadowRoot.querySelectorAll('.original-text')).forEach(item => {
        item.parentNode.removeChild(item);
      });
    }
    this._toggleSegmentedTextualInfo(false);
  }

  _toggleSegmentedTextualInfo(showSegmentedIDs) {
    const textContent = this.shadowRoot.querySelector('#segmented_text_content');
    if (showSegmentedIDs) {
      textContent.classList.add('segmented-infomode');
    } else {
      textContent.classList.remove('segmented-infomode');
    }
  }

  _tweakText(text) {
    return text + (text.match(/—$/) ? '' : ' ');
  }

  _addPrimaryText(textStrings) {
    const textContainer = this.shadowRoot.querySelector('#segmented_text_content');
    const segments = textContainer.getElementsByTagName('sc-seg');
    try {
      this._setPrimaryTextSegmentProperties(segments);
      this._insertPrimaryTextIntoSegments(textStrings, textContainer);
      this._deleteEmptySegments();
    }
    catch (e) {
      console.error(e);
    }
  }

  _setPrimaryTextSegmentProperties(segments) {
    let segmentClass, classToDelete, langAttr;
    if (this.translatedSutta) {
      segmentClass = 'translated-text';
      classToDelete = 'original-text';
      langAttr = this.translationLang;
    } else {
      segmentClass = 'original-text';
      classToDelete = 'translated-text';
      langAttr = this.rootLang;
    }
    Array.from(segments).forEach(segment => {
      segment.classList.add(segmentClass);
      segment.classList.remove(classToDelete);
      this._setScriptISOCode(segment, langAttr);
      segment.innerHTML = '';
    }
    );
  }

  _insertPrimaryTextIntoSegments(textStrings, textContainer) {
    Object.entries(textStrings).forEach(([key, value]) => {
      if (!key.startsWith('_')) {
        let subkey = key.replace(/:/g, '\\\:').replace(/\./g, '\\\.');
        const segment = textContainer.querySelector(`#${subkey}`);
        segment.innerHTML = this._tweakText(value);
      }
    });
  }

  _deleteEmptySegments() {
    const pTags = this.shadowRoot.querySelectorAll('p');
    Array.from(pTags).forEach(p => {
      const segments = Array.from(p.querySelectorAll('sc-seg'));
      let containsText = false;
      for (let i = 0; i < segments.length; i++) {
        if (segments[i].textContent !== '') {
          containsText = true;
          break;
        }
      }
      if (!containsText) p.remove();
    })
  }

  // creates a second 'sc-element' behind every 'sc-element' in the base markup and
  // populates that with the corresponding pali text segment.
  _addSecondaryText() {
    const textContainer = this.$.segmented_text_content;
    if (!this.shadowRoot.querySelector('.original-text')) {
      const stringsArr = Object.entries(this.rootSutta.strings);
      stringsArr.forEach(item => {
        this._insertSecondaryTextSegment(item);
      });
      if (this.rootSutta.lang === 'pli' || this.rootSutta.lang === 'lzh') {
        this._putIntoSpans('.original-text', this.rootSutta.lang);
      }
    }
    textContainer.classList.add('latin-script');
  }

  _insertSecondaryTextSegment([key, content]) {
    if (!key.startsWith('_')) {
      const subkey = key.replace(/:/g, '\\\:').replace(/\./g, '\\\.');
      const segment = this.$.segmented_text_content.querySelector(`#${subkey}`);
      const newSegment = document.createElement('sc-seg');
      newSegment.id = key;
      newSegment.classList.add('original-text');
      newSegment.innerHTML = this._tweakText(content);
      this._setScriptISOCode(newSegment, this.rootLang);
      if (segment){
        segment.parentNode.insertBefore(newSegment, segment.nextSibling);
      }
      else{
        this.translatedSutta.strings[key] = "";
        this.addRootAndTranslatedSegment(key, subkey, newSegment);
      }
    }
  }

  addRootAndTranslatedSegment(key, subkey, newSegment) {
    let { rootSuttaSection, sectionId } = this.addRootSuttaSection(key);

    const newTranslatedSegment = document.createElement('sc-seg');
    newTranslatedSegment.id = key;
    newTranslatedSegment.classList.add('translated-text');
    this._setScriptISOCode(newTranslatedSegment, this.translationLang);

    var rootSuttaLastkey = Object.keys(this.rootSutta.strings).sort().pop();
    if (key !== rootSuttaLastkey) {
      rootSuttaSection = this.$.segmented_text_content.querySelector(`#${sectionId}`);
      if (rootSuttaSection) rootSuttaSection.appendChild(newTranslatedSegment);
      let segment = this.$.segmented_text_content.querySelector(`#${subkey}`);
      if (segment) segment.parentNode.insertBefore(newSegment, segment.nextSibling);
    }
    else {
      this.addEndSection();
      const endSection = this.$.segmented_text_content.querySelector('.endsection');
      if (endSection){
        endSection.appendChild(newTranslatedSegment);
        endSection.appendChild(newSegment);
      }
    }
  }

  addEndSection() {
    const newEndSection = document.createElement('p');
    newEndSection.classList.add('endsection');
    const articleElement = this.$.segmented_text_content.getElementsByTagName('article')[0];
    if (articleElement)
      articleElement.appendChild(newEndSection);
  }

  addRootSuttaSection(key) {
    let sectionId = `rootSutta-sc${key.split(':')[1].split('.')[0]}`;
    let rootSuttaSection = this.$.segmented_text_content.querySelector(`#${sectionId}`);
    if (!rootSuttaSection) {
      const newSection = document.createElement('p');
      newSection.id = sectionId;
      const articleElement = this.$.segmented_text_content.getElementsByTagName('article')[0];
      if (articleElement)
        articleElement.appendChild(newSection);
    }
    return { rootSuttaSection, sectionId };
  }

  // After the paragraph list has been loaded, adds relevant data to the placeholders in the sutta text file.
  _computeParagraphs() {
    const uid = (this.rootSutta || this.translatedSutta).uid;
    let divisionId = /^[a-z]+/.exec(uid)[0];
    if (divisionId === 'pli') divisionId = 'vi';
    if (divisionId === 'iti') divisionId = 'it';
    this._setParagraphsVisible(this.showParagraphs);

    if (!this.paragraphs || !this.showParagraphs) {
      return;
    }
    this.paragraphs.forEach((paragraph) => {
      const refs = this.$.segmented_text_content.querySelectorAll(`.${paragraph.uid}:not(.textual-info-paragraph-inline)`);
      Array.from(refs).forEach((item) => {
        if (this._shouldDisplayBookIcon(divisionId, item.id)) {
          this._processVolPageInfo(item, divisionId, paragraph);
        } else {
          this._addParagraphData(item, paragraph);
        }
      });
    });

    setTimeout(() => {
      this._applyQuoteHanger();
    });
  }

  _shouldDisplayBookIcon(divisionId, itemId) {
    let divisionIdMatch = (divisionId === 'tha' || divisionId === 'thi');
    let secondEdition = itemId.includes('2ed');
    let correctId = (itemId.startsWith('pts-vp-pli') || itemId.match(/pts[1-9]/));
    return (!divisionIdMatch && !secondEdition && correctId);
  }

  _processVolPageInfo(item, divisionId, paragraph) {
    let prefix = /[^\d]+/.exec(item.id)[0];
    const suffix = item.id.substring(prefix.length);
    let [vol, pageNumber] = suffix.split('.');
    if (vol.includes('ed')) {
      let ed;
      [ed, vol] = vol.split('ed');
      prefix += `${ed}ed`;
    }
    let displayText = `${vol}.${pageNumber}`;
    if (!pageNumber) {
      pageNumber = vol;
      vol = '1';
      displayText = `${pageNumber}`;
    }
    pageNumber = Number(pageNumber);
    vol = Number(vol);
    if (vol === 0) {
      displayText = `${pageNumber}`;
      vol = 1;
    }
    requestAnimationFrame(() => {
      item.innerHTML = `
              <span class="image-link" >
                  <span title="${paragraph ? paragraph.description : ''}" class="${prefix}">${displayText}</span>
                  <iron-icon title="${this.localize('viewImage')}" class="image-book-link" icon="sc-iron-icons:book">
                  </iron-icon>
              </span>
          `;
      item.classList.add('image-book-link');
      item.classList.add('textual-info-paragraph');
      setTimeout(() => {
        item.addEventListener('click', () => {
          this.dispatchEvent(new CustomEvent('show-image', {
            detail: { vol: vol, division: divisionId, pageNumber: pageNumber },
            bubbles: true,
            composed: true
          }));
        });
      }, 0);
    });
  }

  _addSegmentedTextualInfoElements() {
    const segments = this.shadowRoot.querySelectorAll('sc-seg');
    Array.from(segments).forEach((segment) => {
      const parId = segment.id.split(':')[1];
      // The 0 level is to be ignored when adding segmented IDs:
      if (parId[0] === '0') {
        return;
      }
      this._insertSegmentedParagraph(parId, segment);
    });
    this.segmentedIDsAdded = true;
  }

  _insertSegmentedParagraph(parId, segment) {
    // Don't insert duplicate segments
    if (this.translatedSutta && segment.classList.contains('original-text')) {
      return;
    }
    const inlineParagraph = document.createElement('a');
    inlineParagraph.classList.add('textual-info-paragraph', 'segmented-textual-info-paragraph',
      'textual-info-paragraph-inline', 'sc');
    inlineParagraph.id = `${parId}_inline`;
    inlineParagraph.textContent = parId;
    inlineParagraph.href = `#${parId}`;
    inlineParagraph.title = 'SuttaCentral segment number';
    inlineParagraph.addEventListener('click', () => {
      this._scrollToSection(inlineParagraph.id, true, 0)
    });
    requestAnimationFrame(() => {
      segment.insertBefore(inlineParagraph, segment.firstChild);
    });
    return inlineParagraph;
  }

  _addParagraphData(item, data) {
    item.innerHTML = item.id.replace(data.uid, '');
    item.title = data.description;
    item.href = `#${item.id}`;
    item.classList.add('textual-info-paragraph');
  }

  // adds a class to the main container to either show or hide the textual info paragraphs
  _setParagraphsVisible(visible) {
    const textElement = this.$.segmented_text_content;
    if (textElement) {
      visible ? textElement.classList.add('infomode') : textElement.classList.remove('infomode');
    }
  }

  // Display the loading indicator in two cases:
  // 1: If there's no error and the text view is loading, or...
  // 2: If the text view is currently hidden
  _shouldShowLoadingIndicator(error, loading, isTextViewHidden) {
    return ((!error && loading) || isTextViewHidden);
  }

  _putSectionIntoWrapper(section) {
    let wrapper;
    if (section.parentNode && section.parentNode.classList.contains('highlight-wrapper')) {
      section.parentNode.classList.add('highlight-wrapper-highlighted');
    } else {
      if (this._previousElementIsNotFullWrapper(section)) {
        wrapper = section.previousElementSibling;
      } else {
        wrapper = document.createElement('span');
      }
      wrapper.classList.add('highlight-wrapper-highlighted');
      wrapper.classList.add('highlight-wrapper');
      section.parentNode.insertBefore(wrapper, section);
      wrapper.appendChild(section.cloneNode(true));
    }
    return wrapper;
  }

  _processLastSection(section, wrapper, idFrom, idTo, isSideBySideView, isLineByLineView, wrapperAlreadyExists) {
    const paddingBottom = window.getComputedStyle(section).paddingBottom;
    const marginTop = window.getComputedStyle(section).marginTop;
    if (paddingBottom && paddingBottom !== '0px') {
      section.style.paddingBottom = '0';
      section.style.marginBottom = paddingBottom;
    }
    if (marginTop && marginTop !== '0px') {
      section.style.marginTop = '0';
      section.style.paddingTop = marginTop;
    }
    if ((idFrom.includes('.') && !idFrom.startsWith('pts')) ||
      (idTo && idTo.includes('.') && !idTo.startsWith('pts'))) {
      let newSection;
      (isSideBySideView || isLineByLineView) ? newSection = section.nextElementSibling : newSection = section;

      if (isSideBySideView && !wrapperAlreadyExists) {
        section.remove();
      }
      newSection ? section = newSection : '';

      if (!isSideBySideView) {
        section.classList.add('highlight');
        isLineByLineView ? section.parentNode.style.margin = '0' : '';
      }
      if (isSideBySideView && !wrapperAlreadyExists) {
        wrapper.appendChild(section.cloneNode(true));
        wrapper.style.paddingTop = window.getComputedStyle(wrapper.parentNode).marginTop;
        wrapper.parentNode.style.marginTop = "0";
        section.remove();
      }

    }
  }

  _processParagraphHighlight(section, isSideBySideView, wrapperAlreadyExists, wrapper) {
    let paragraph = section.parentNode;
    const margin = window.getComputedStyle(paragraph).margin;
    if (this.chosenTextView !== 'none') {
      requestAnimationFrame(() => {
        if (!paragraph.previousElementSibling.classList.contains("hgroup")) {
          paragraph.style.margin = '0';
        }
      });
    }
    if (isSideBySideView && !wrapperAlreadyExists) {
      requestAnimationFrame(() => {
        wrapper.style.padding = margin;
      })
    }

    let newSection = paragraph.nextElementSibling.getElementsByTagName("sc-seg")[0];
    if (isSideBySideView && !wrapperAlreadyExists) {
      section.remove();
    }
    if (!newSection) {
      let sectionList = paragraph.parentNode.getElementsByTagName("sc-seg");
      for (let i = 0; i < sectionList.length; i++) {
        if (sectionList[i] === section) {
            sectionList[i+1] ? newSection = sectionList[i+1] : '';
            break;
        }
      }
    }
    return newSection;
  }

  _processHighlightAndScroll(sectionId) {
    let [idFrom, idTo] = sectionId.split('--');
    if (idFrom.match(/^[0-9]+$/)) {
      idFrom = `sc${idFrom}`
    }
    if (idTo && idTo.match(/^[0-9]+$/)) {
      idTo = `sc${idTo}`
    }
    idFrom = this._generateId(idFrom);
    idTo = this._generateId(idTo);
    let firstSection = this.shadowRoot.getElementById(idFrom);
    if (!firstSection) {
      return;
    }
    firstSection = this._getElementToHighlight(firstSection);
    let section = firstSection;
    let toSection = this.shadowRoot.getElementById(idTo);
    if (toSection) {
      toSection = this._getElementToHighlight(toSection);
    }
    const isSideBySideView = !!(this.chosenTextView === 'sidebyside' && this.translatedSutta)
    const isLineByLineView = !!(this.chosenTextView === 'linebyline' && this.translatedSutta);
    this._processSections(section, isSideBySideView, isLineByLineView, toSection, idFrom, idTo);
    return firstSection;
  }

  _processSections(section, isSideBySideView, isLineByLineView, toSection, idFrom, idTo) {
    while (section && section.classList) {
      let wrapper;

      if (isSideBySideView) {
        wrapper = this._putSectionIntoWrapper(section);
      } else {
        section.classList.add('highlight');
        if (section.nextElementSibling && section.nextElementSibling.classList.contains("added")){
          section.nextElementSibling.classList.add('highlight');
        }
      }

      const wrapperAlreadyExists = !wrapper;

      const margin = window.getComputedStyle(section).margin;

      if (section === toSection || !toSection) {
        if (section.nextElementSibling && section.nextElementSibling.classList.contains("added") && margin && margin !== '0px') {
            section.nextElementSibling.style.margin = '0';
            section.nextElementSibling.style.padding = margin;
        }
        if (section.nextElementSibling && section.nextElementSibling.parentNode.classList.contains("added")) {
            section.nextElementSibling.parentNode.style.margin = '0';
            section.nextElementSibling.parentNode.style.padding = margin;
        }
        this._processLastSection(section, wrapper, idFrom, idTo, isSideBySideView, isLineByLineView, wrapperAlreadyExists);
        break;
      } else if (margin && margin !== '0px') {
        section.style.margin = '0';
        section.style.padding = margin;
      }

      if (section.nextElementSibling === null && (section.parentNode.nodeName === 'P' || section.parentNode.nodeName === 'SPAN')) {
        section = this._processParagraphHighlight(section, isSideBySideView, wrapperAlreadyExists, wrapper);
      } else {
        let newSection = section.nextElementSibling;
        if (isSideBySideView && !wrapperAlreadyExists) {
          section.remove();
        }
        section = newSection;
      }
    }
  }

  _previousElementIsNotFullWrapper(section) {
    if (!section.previousElementSibling) {
      return false;
    }
    if (section.nodeName !== 'SC-SEG') {
      return true;
    } else if (this._hasScSegments(section.previousElementSibling) &&
      section.previousElementSibling.classList.contains('highlight-wrapper-highlighted')) {
      return true;
    }
    return false;
  }

  _getElementToHighlight(element) {
    if (element.id.includes('inline') && !element.id.includes('.')) {
      element = element.parentNode;
    }
    return element.parentNode;
  }

  _generateId(id) {
    if (id && id.includes('.') && !id.includes('inline') && !id.startsWith('pts')) {
      return `${id}_inline`;
    }
    return id;
  }

  _hasScSegments(wrapper) {
    return wrapper.querySelectorAll('sc-seg').length === 1;
  }

  _removeHighlights() {
    this.shadowRoot.querySelectorAll('.highlight').forEach(v => {
      v.classList.remove('highlight');
      v.classList.remove('last-highlight');
    });
    this.shadowRoot.querySelectorAll('.highlight-wrapper-highlighted').forEach(v => {
      v.classList.remove('highlight-wrapper-highlighted');
    })
  }

  _disableHighlightWrappers() {
    this.shadowRoot.querySelectorAll('.highlight-wrapper').forEach(v => {
      v.classList.remove('highlight-wrapper');
      v.classList.add('disabled-highlight-wrapper');
    })
  }

  // Scrolls to the chosen section
  _scrollToSection(sectionId, isSmooth, delay) {
    if (!sectionId || this.currentId === sectionId) {
      return;
    }
    this._removeHighlights();
    setTimeout(() => {
      const section = this._processHighlightAndScroll(sectionId) || this.shadowRoot.getElementById(sectionId);
      const options = { behavior: isSmooth ? 'smooth' : 'instant', block: 'start', inline: 'nearest' };
      if (section) {
        section.scrollIntoView(options);
      }
    }, delay);
    this.currentId = sectionId;
  }

  _scrollToSectionInUrl() {
    let textualInfoId = '';
    const bodyStyle = window.getComputedStyle(document.body);
    const xlScreenWidth = JSON.parse(bodyStyle.getPropertyValue('--sc-screen-xl').replace('px', ''));
    if (window.innerWidth < xlScreenWidth) {
      textualInfoId = `${window.location.hash.substr(1)}_inline`;
    } else {
      textualInfoId = `${window.location.hash.substr(1)}`;
    }
    this._scrollToSection(textualInfoId, false, 2000);
  }

  _changeScript(toScript) {
    if (!this.rootSutta || this.rootSutta.lang !== 'pli') {
      return;
    }
    const segments = this.shadowRoot.querySelectorAll('.original-text');
    const tooltips = this.shadowRoot.querySelectorAll('paper-tooltip');
    const scriptNames = Object.keys(this.scriptIsoCodes);
    if (this.hasScriptBeenChanged) {
      this._resetScript(segments, tooltips);
    }
    if (toScript === 'latin') {
      this.$.segmented_text_content.classList.add('latin-script');
      // set the latin text segment iso codes, if not set already
      if (!this.$.segmented_text_content.querySelector(`.original-text[lang='pli-Latn']`)) {
        segments.forEach((item) => this._setScriptISOCode(item, this.rootLang));
      }
      this.hasScriptBeenChanged = false;
    } else if (scriptNames.includes(toScript)) { // if the script name is valid:
      this._setScript(toScript, segments, tooltips);
      this.hasScriptBeenChanged = true;
    }
    if (!this.translatedSutta) { // if we're in a segmented root text, set the top text div lang attribute:
      this._setScriptISOCode(this.shadowRoot.querySelector('#segmented_text_content'), this.rootLang);
    } else {
      const text = this.shadowRoot.querySelector('#segmented_text_content');
      if (text) text.removeAttribute('lang');
    }
  }

  _setScriptISOCode(targetNode, langAttr) {
    if (langAttr === 'pli' && this.paliScript) {
      langAttr += `-${this.scriptIsoCodes[this.paliScript]}`;
    }
    targetNode.setAttribute('lang', langAttr);
  }

  _resetScript(segments, tooltips) {
    Object.keys(this.scriptIsoCodes).forEach((scriptName) => {
      this.$.segmented_text_content.classList.remove(`${scriptName}-script`);
    });
    Array.from(segments).forEach(item => {
      let words = item.querySelectorAll('.word');
      Array.from(words).forEach(word => word.innerHTML = word.dataset.latin_text || word.innerHTML);
    });
    Array.from(tooltips).forEach(item => item.innerHTML = this.rootSutta.strings[item.id]);
  }

  _setScript(scriptName, segments, tooltips) {
    this.$.segmented_text_content.classList.add(`${scriptName}-script`);
    const t = new Transliterator();
    const scriptFunctionName = `to${this._capitalize(scriptName)}`;
    this._ensureSpansExist();
    this._setScriptOfSegments(segments, scriptFunctionName, t);
    Array.from(tooltips).forEach(item => item.innerHTML = t[scriptFunctionName](item.innerHTML));
  }

  _ensureSpansExist() {
    if (!this.spansForWordsGenerated) {
      this._conditionallyPutWordsIntoSpans();
    }
  }

  _setScriptOfSegments(segments, scriptFunctionName, t) {
    Array.from(segments).forEach(item => {
      this._setScriptISOCode(item, this.rootLang);
      let words = item.querySelectorAll('.word');
      Array.from(words).forEach(word => {
        word.dataset.latin_text = word.innerHTML;
        word.innerHTML = t[scriptFunctionName](word.innerHTML);
      })
    });
  }

  _capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  _loadingChanged() {
    this.isTextViewHidden = this.isLoading;
  }

  _shouldShowError(rootSutta, translatedSutta) {
    try {
      if (!translatedSutta) {
        return rootSutta ? !(rootSutta.strings) : true;
      }
      return !(translatedSutta.strings);
    } catch (e) {
      console.error(e);
    }
  }

  // Lookup word start
  _putGraphsIntoSpans(selector) {
    this._startGeneratingSpans(selector, 'graph');
  }

  _putWordsIntoSpans(selector) {
    this._startGeneratingSpans(selector, 'word');
  }

  _startGeneratingSpans(selector, unit) {
    let segments = this.shadowRoot.querySelectorAll(selector);
    segments = Array.from(segments);
    let empty = true;
    while (segments.length > 0) {
      const segment = segments.shift();
      if (!segment) {
        return;
      }
      empty = false;
      this._putSegmentIntoSpans(segment, unit, this);
      this._addLookupTooltips(segment, this);
    }
    if (empty) {
      return;
    }
    if (unit === 'word') {
      this.spansForWordsGenerated = true;
    } else if (unit === 'graph') {
      this.spansForGraphsGenerated = true;
    }
  }

  _putSegmentIntoSpans(segment, unit, that) {
    const text = segment.innerHTML;
    let div = document.createElement('div');
    div.innerHTML = text;
    that._recurseDomChildren(div, true, unit);
    segment.innerHTML = div.innerHTML.replace(/%spfrnt%/g, `<span class="word">`).replace(/%spback%/g, '</span>').replace(/—/g, '</span>—<span class="word">');
  }

  _recurseDomChildren(start, output, unit) {
    let nodes;
    if (start.childNodes) {
      nodes = start.childNodes;
      this._loopNodeChildren(nodes, output, unit);
    }
  }

  _loopNodeChildren(nodes, output, unit) {
    let node;
    for (let i = 0; i < nodes.length; i++) {
      node = nodes[i];
      if (node.classList && (node.classList.contains('image-link') ||
        node.classList.contains('textual-info-paragraph'))) {
        continue;
      }
      this._addSpanToNode(node, unit);
      if (node.childNodes) {
        this._recurseDomChildren(node, output, unit);
      }
    }
  }

  _addSpanToNode(node, unit) {
    const NODE_TYPE_TEXT = 3;
    if (node.nodeType !== NODE_TYPE_TEXT) return;
    let tt = node.data;
    let strArr = tt.split(/\s+/g);
    let str = '';
    for (let i = 0; i < strArr.length; i++) if (strArr[i]) {
      if (unit === 'word') {
        str += `%spfrnt%${strArr[i]}%spback% `;
      } else if (unit === 'graph') {
        for (let graph of strArr[i]) {
          str += `%spfrnt%${graph}%spback%`;
        }
        str += ' ';
      }
    }
    node.data = str;
  }

  _addPopupTooltips(textContent) {
    const transliterator = new Transliterator();
    Array.from(textContent.querySelectorAll('.translated-text')).forEach(segment => {
      let tooltip = document.createElement('paper-tooltip');
      let states = { isWordHovered: false, isTooltipHovered: false, isTooltipShown: false };
      this._setTooltipOptions(tooltip);
      segment.addEventListener('mouseover', () => {
        if (this.chosenTextView !== 'popup') return;
        requestAnimationFrame(() => {
          segment.style.color = this._getAccentColor();
          states.isWordHovered = true;
          this._showPopupTooltip(segment, tooltip, states, transliterator);
        });
      });
      segment.addEventListener('mouseout', () => {
        states.isWordHovered = false;
        this._resetColor(states, segment);
        this._removeTooltip(segment, tooltip, states);
      });
      tooltip.addEventListener('mouseover', () => {
        states.isTooltipHovered = true;
      });
      tooltip.addEventListener('mouseout', () => {
        states.isTooltipHovered = false;
        this._removeTooltip(segment, tooltip, states);
      });
    }
    );
  }

  _showPopupTooltip(segment, tooltip, states, transliterator) {
    tooltip.innerHTML = this._transliterateFragment(this.rootSutta.strings[segment.id], transliterator);
    segment.appendChild(tooltip);
    requestAnimationFrame(() => {
      if (states.isWordHovered && !states.isTooltipShown) {
        tooltip.show();
        states.isTooltipShown = true;
      }
    });
  }

  _transliterateFragment(fragment, transliterator) {
    if (this.paliScript === 'latin') {
      return fragment;
    } else {
      const scriptFunctionName = `to${this._capitalize(this.paliScript)}`;
      return transliterator[scriptFunctionName](fragment);
    }
  }

  _showLookupTooltip(v, tooltip, paliLookup, states) {
    let lookupResult = paliLookup.lookupWord(v.dataset.latin_text || v.textContent);
    tooltip.innerHTML = lookupResult.html;
    v.parentNode.insertBefore(tooltip, v.nextSibling);
    if (states.isWordHovered && !states.isTooltipShown) {
      v.id = `lookup_target${this.tooltipCount}`;
      tooltip.for = `lookup_target${this.tooltipCount}`;
      this.tooltipCount++;
      tooltip.show();
      states.isTooltipShown = true;
    }
  }

  _removeTooltip(word, tooltip, states) {
    requestAnimationFrame(() => {
      if (!states.isWordHovered && !states.isTooltipHovered) {
        word.style.color = '';
        if (word.nodeName !== 'SC-SEG') {
          word.removeAttribute('id');
        }
        tooltip.hide();
        states.isTooltipShown = false;
      }
    });
  }

  _addLookupTooltips(textContainer) {
    let paliLookup = this.shadowRoot.querySelector('#pali_lookup');
    textContainer.querySelectorAll('.word').forEach((word) => {
      let tooltip = document.createElement('paper-tooltip');
      let states = { isWordHovered: false, isTooltipHovered: false, isTooltipShown: false };
      this._setTooltipOptions(tooltip);
      word.addEventListener('mouseover', () => {
        if (this.isPaliLookupEnabled) {
          requestAnimationFrame(() => {
            word.style.color = this._getAccentColor(); // It can not be in class because of some strange bug in some cases.
            states.isWordHovered = true;
            this._showLookupTooltip(word, tooltip, paliLookup, states);
          });
        }
      });
      word.addEventListener('mouseout', () => {
        states.isWordHovered = false;
        this._resetColor(states, word);
        this._removeTooltip(word, tooltip, states);
      });
      tooltip.addEventListener('mouseover', () => {
        states.isTooltipHovered = true;
      });
      tooltip.addEventListener('mouseout', () => {
        states.isTooltipHovered = false;
        this._removeTooltip(word, tooltip, states);
      });
    })
  }

  _setTooltipOptions(tooltip) {
    tooltip.classList.add('lookup-tooltip');
    tooltip.animationDelay = 0;
    tooltip.position = 'top';
    tooltip.manualMode = true;
    tooltip.fitToVisibleBounds = true;
    tooltip.offset = 0;
    tooltip.style['padding-bottom'] = '.2em';
  }

  _getAccentColor() {
    const bodyStyle = window.getComputedStyle(document.body);
    return bodyStyle.getPropertyValue('--sc-primary-accent-color');
  }

  _conditionallyPutIntoSpans(lang) {
    if (this.translatedSutta && this.translatedSutta.lang === lang) {
      this._putIntoSpans('.translated-text', lang);
    } else if (this.rootSutta.lang === lang) {
      if (this.shadowRoot.querySelector('.original-text')) {
        this._putIntoSpans('.original-text', lang);
      }
    }
  }

  _putIntoSpans(selector, lang) {
    if (lang === 'pli') {
      this._putWordsIntoSpans(selector);
    } else if (lang === 'lzh') {
      this._putGraphsIntoSpans(selector);
    }
  }

  _resetColor(states, word) {
    requestAnimationFrame(() => {
      if (!states.isTooltipHovered) {
        word.style.color = '';
      }
    });
  }

  _chineseLookupStateChanged() {
    if (this.hidden) {
      return;
    }
    if (this.isChineseLookupEnabled) {
      if (!this.spansForGraphsGenerated) {
        this._conditionallyPutIntoSpans('lzh');
      }
    }
  }

  _getClosestSegmentSibling(node) {
    while (node.nextElementSibling !== null) {
      if (node.nextElementSibling.nodeName === 'SC-SEG') {
        return node.nextElementSibling;
      }
      node = node.nextElementSibling;
    }
    return null;
  }

  _paliLookupStateChanged() {
    if (this.hidden) {
      return;
    }
    if (this.isPaliLookupEnabled) {
      if (!this.spansForWordsGenerated) {
        this._conditionallyPutWordsIntoSpans();
      }
    }
  }

  _conditionallyPutWordsIntoSpans() {
    if (this.translatedSutta &&
      (this.translatedSutta.lang === 'pli' || this.translatedSutta.lang === 'lzh')) {
      this._putWordsIntoSpans('.translated-text');
    } else if (this.rootSutta.lang === 'pli' || this.rootSutta.lang === 'lzh') {
      if (this.shadowRoot.querySelector('.original-text')) {
        this._putWordsIntoSpans('.original-text');
      }
    }
  }

  _browserRequiresShadyDomFix() {
    return (navigator.userAgent.indexOf('Firefox') !== -1 || navigator.userAgent.indexOf('Edge') !== -1);
  }

  _applyFirefoxShadyDomFix() {
    if (this._browserRequiresShadyDomFix()) {
      this.isTextViewHidden = true;
      setTimeout(() => {
        this.$.segmented_text_content.innerHTML = this.$.segmented_text_content.innerHTML;
        this.isTextViewHidden = false;
        this._computeParagraphs();
      }, 0);
    }
  }

  _prepareNavigation() {
    let sutta = this.translatedSutta ? this.translatedSutta : this.rootSutta;
    const dummyElement = document.createElement('template');
    dummyElement.innerHTML = this.markup.trim();
    return Array.from(
      dummyElement.content.querySelectorAll('h2')
    ).map(elem => {
      const id = elem.firstElementChild.id;
      return { link: id, name: this._stripLeadingOrdering(sutta.strings[id]) };
    })
  }

  _stripLeadingOrdering(name) {
    return name.replace(/^\d+\./, '').trim();
  }
}

customElements.define('sc-segmented-text', SCSegmentedText);
