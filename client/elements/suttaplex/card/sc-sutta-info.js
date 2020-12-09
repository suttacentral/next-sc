import {html, css, LitElement} from 'lit-element';
import {unsafeHTML} from "lit-html/directives/unsafe-html";
import SCSuttaTopSheetCommon from './sc-top-sheet-common';
import { typographyCommonStyles } from '../../styles/sc-typography-common-styles.js';

class SCSuttaInfo extends SCSuttaTopSheetCommon {

    constructor() {
        super();
        this.infoDialogMetaArea = '';
        this.localizedStringsPath = '/localization/elements/sc-site-layout';
    }

    static get styles() {
        return [
            super.styles,
            typographyCommonStyles,
            css`
                :host {
                    font-family: var(--sc-sans-font);
                }
                
                section {
                    margin: var(--sc-size-xl) auto;
                    padding: 0 3vw;
                    max-width: 720px;
                }
                
            `];
    }

    static get properties() {
        return {
            infoDialogMetaArea: {type: String},
            localizedStringsPath: {type: String},
        };
    }

    _stateChanged(state) {
        super._stateChanged(state);
        if (this.infoDialogMetaArea !== state.suttaMetaText) {
            this.infoDialogMetaArea = state.suttaMetaText;
        }

    }

    render() {
        return html`
            <section>
                <h2>
                    ${this.localize('publicationDetails')}
                </h2>
                <p>
                    ${unsafeHTML(this.infoDialogMetaArea)}
                </p>
            </section>
        `;
    }
}

customElements.define('sc-sutta-info', SCSuttaInfo);