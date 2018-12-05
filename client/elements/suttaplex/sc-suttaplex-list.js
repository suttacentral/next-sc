import { PolymerElement, html } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-spinner/paper-spinner-lite.js';
import '@polymer/iron-dropdown/iron-dropdown-scroll-manager.js';

import './sc-suttaplex-section-title.js';
import './sc-suttaplex.js';
import { ReduxMixin } from '/redux-store.js';
import { API_ROOT } from '../../constants.js';
import { Localized } from '../addons/localization-mixin.js';

class SCSuttaplexList extends ReduxMixin(Localized(PolymerElement)) {
  static get template() {
    return html`
    <style>
      .division-content {
        color: var(--sc-primary-text-color);
        /* Subtract margins and top bar height */
        height: calc(100vh - var(--sc-size-md-larger) * 2 - var(--sc-size-xxl));
        position: relative;
        padding: 0;
      }

      .main {
        margin: var(--sc-size-md-larger) auto;
        max-width: 720px;
      }

      .node {
        padding: var(--sc-size-md) var(--sc-size-md) 0;
        color: var(--sc-secondary-text-color);
      }

      .vagga-node {
        padding: 0 var(--sc-size-md) var(--sc-size-md) var(--sc-size-md);
        color: var(--sc-secondary-text-color);
      }

      .loading-spinner {
        @apply --center;
        z-index: 999;
        --paper-spinner-color: var(--sc-primary-color);
      }

      :host {
        display: block;
      }

      .network-error {
        @apply --center;
        @apply --sc-sans-font;
        @apply --sc-skolar-font-size-static-subtitle;
        color: var(--sc-secondary-text-color);
        text-align: center;
      }

      .network-error-icon {
        width: var(--sc-size-xxl);
        height: var(--sc-size-xxl);
      }
    </style>

    <iron-ajax auto="" id="uid_expansion_ajax" url="/api/expansion" handle-as="json" last-error="{{expansionError}}" last-response="{{expansionReturns}}"></iron-ajax>

    <iron-ajax id="ajax" handle-as="json" last-error="{{suttaplexError}}" loading="{{suttaplexLoading}}" last-response="{{suttaplexReturns}}"></iron-ajax>

    <div class="division-content main">

      <div class="loading-indicator">
        <paper-spinner-lite class="loading-spinner" active="[[suttaplexLoading]]"></paper-spinner-lite>
      </div>

      <template is="dom-if" if="[[_shouldShowErrorIcon(suttaplexError, suttaplexReturns)]]">
        <div class="network-error">
          <iron-icon class="network-error-icon" title="{{localize('networkError')}}" src="/img/nonetwork.svg"></iron-icon>
          <div>{{localize('networkError')}}</div>
        </div>
      </template>

      <template is="dom-repeat" items="[[suttaplexReturns]]" as="item" id="suttaplex_list" class="suttaplex-list">
        <template is="dom-if" if="{{_isSuttaplex(item)}}">
          <sc-suttaplex item="[[item]]" parallels-opened="[[_areParallelsOpen(item)]]" difficulty="[[_computeItemDifficulty(item.difficulty)]]" expansion-data="[[expansionReturns]]" suttaplex-list-style="[[suttaplexListView]]">
          </sc-suttaplex>
        </template>

        <template is="dom-if" if="{{!_isSuttaplex(item)}}">
          <section class$="[[_calculateClass(item.type)]]">
            <sc-suttaplex-section-title input-title="[[item.original_title]]" input-text="[[item.blurb]]" input-type="[[item.type]]" opened="[[_calculateOpened(suttaplexReturns)]]"></sc-suttaplex-section-title>
          </section>
        </template>
      </template>

    </div>

    [[_createMetaData(suttaplexReturns, localize)]]
    `;
  }

  static get properties() {
    return {
      categoryId: {
        type: String,
        statePath: 'currentRoute.categoryId',
        observer: '_categoryChanged'
      },
      item: {
        type: Object
      },
      expansionReturns: {
        type: Array
      },
      expansionError: {
        type: Object
      },
      suttaplexReturns: {
        type: Array,
        observer: '_suttaplexReturnsChanged'
      },
      suttaplexError: {
        type: Object
      },
      localizedStringsPath: {
        type: String,
        // This is using the navigation menu file, because we only need the translated network error string here.
        value: '/localization/elements/sc-navigation-menu'
      },
      suttaplexListEnabled: {
        type: Boolean,
        statePath: 'suttaplexListDisplay',
        observer: '_setSuttaplexListStyle'
      },
      suttaplexListView: {
        type: String
      }
    }
  }

  _setSuttaplexListStyle() {
    if (this.suttaplexListEnabled) {
      this.suttaplexListView = 'list-view';
    } else {
      this.suttaplexListView = '';
    }
    this.$.ajax.generateRequest();
  }

  static get actions() {
    return {
      changeToolbarTitle(title) {
        return {
          type: 'CHANGE_TOOLBAR_TITLE',
          title: title
        };
      }
    }
  }

  _categoryChanged() {
    if (!this.categoryId || !this.language) {
      return;
    }
    this.$.ajax.url = `${API_ROOT}\/suttaplex\/${this.categoryId}?language=${this.language}`;
    this.$.ajax.generateRequest();
  }

  _suttaplexReturnsChanged() {
    if (!this.suttaplexReturns) {
      return;
    }
    this.dispatch('changeToolbarTitle', this.suttaplexReturns[0].original_title);
  }

  _isSuttaplex(item) {
    return item.type === 'text';
  }

  _shouldShowErrorIcon(isError, suttaplexItems) {
    if (suttaplexItems) {
      return (isError && suttaplexItems.length === 0) || suttaplexItems.length === 0;
    } else {
      return isError;
    }
  }

  _calculateClass(itemType) {
    return itemType === 'grouping' ? 'node' : 'vagga-node';
  }

  // Close parallels when navigating to new page
  _areParallelsOpen(item) {
    return (this.suttaplexReturns.length === 1) ? true : false;
  }

  _computeItemDifficulty(difficulty) {
    if (!difficulty) return;
    if (difficulty.name) {
      return difficulty.name;
    }
    else {
      const levels = { 1: 'beginner', 2: 'intermediate', 3: 'advanced' };
      return levels[difficulty];
    }
  }

  _calculateOpened(suttaplexReturns) {
    return (suttaplexReturns.length <= 3);
  }

  _createMetaData(suttaplexReturns, localize) {
    if (!suttaplexReturns) {
      return;
    }
    let description = localize('metaDescriptionText');
    if (suttaplexReturns[0].blurb) {
      description = suttaplexReturns[0].blurb;
    }

    document.dispatchEvent(new CustomEvent('metadata', {
      detail: {
        pageTitle: `${suttaplexReturns[0].original_title}—Suttas and Parallels`,
        title: `${suttaplexReturns[0].original_title}—Suttas and Parallels`,
        description: description,
        bubbles: true,
        composed: true
      }
    }));
  }
}

customElements.define('sc-suttaplex-list', SCSuttaplexList);
