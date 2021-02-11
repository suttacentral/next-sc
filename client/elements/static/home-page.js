import { css, html } from 'lit-element';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

import { SCStaticPage } from '../addons/sc-static-page.js';
import { API_ROOT } from '../../constants.js';
import '../navigation/sc-tipitaka.js';
import { icon } from '../../img/sc-icon';

class SCHomePage extends SCStaticPage {
  static get properties() {
    return {
      randomEpigrah: { type: String },
      whyWeRead: { type: String },
    };
  }

  static get styles() {
    return css`
      :root {
        font-family: var(--sc-sans-font);
        font-size: var(--sc-skolar-font-size-md);
        font-weight: 400;
      }

      main {
        max-width: 1600px;
        margin: 0 auto;
      }

      section + section {
        margin-top: 4%;
      }

      .plain {
        font-size: 1.125rem;

        display: flex;
        flex-direction: column;

        padding: 0 0;

        text-align: center;

        align-items: center;
        justify-content: center;
      }

      .quotation {
        padding: 1em 0 1.5em 0;
        background-color: var(--sc-tertiary-background-color);
        width: calc(100vw - var(--scrollbar-width));
        transform: translateX(calc((min(1600px, 100%) - 100%) / 2));
      }

      .quotation h2 {
        font-family: var(--sc-sans-font);
        letter-spacing: var(--sc-caps-letter-spacing);
        color: var(--sc-secondary-text-color);

        font-variant-caps: all-small-caps;
        margin-bottom: 1em;
      }

      .tipitaka-section {
        font-size: 1.125rem;

        display: flex;
        flex-direction: column;

        box-sizing: border-box;
        min-height: 39px;
        margin: 0 6vw 24px;
        padding-bottom: 3px;

        text-align: center;

        border-bottom: 2px solid var(--sc-primary-color-light);

        align-items: center;
      }

      .tipitaka-section h2 {
        line-height: 1;

        box-sizing: border-box;
        width: 100%;
        padding-bottom: 12px;

        letter-spacing: var(--sc-caps-letter-spacing);

        border-bottom: 1px solid var(--sc-primary-color-light);

        font-variant-caps: all-small-caps;
      }

      .tipitaka-section h2 i {
        font-size: 0.6667em;
        font-style: italic;

        display: inline-block;

        height: 17px;

        vertical-align: middle;
        letter-spacing: normal;

        font-variant-caps: normal;
      }

      blockquote {
        font-family: var(--sc-serif-font);
        font-size: 1.5rem;
        font-size: clamp(1.125em, 3.75vw, 1.5em);
        font-weight: 300;
        font-style: italic;
        line-height: 1.5;

        position: relative;

        width: 80%;
        margin: 0 0 2% 0;
        padding: 0;

        text-align: center;
      }

      /* ensure a consistent spacing for the quote decoration */
      blockquote span {
        position: relative;
      }

      blockquote span:before {
        font-size: 4em;
        line-height: 1;

        position: absolute;
        left: -0.5em;

        content: '“';

        color: var(--sc-disabled-text-color);
      }

      article {
        display: flex;
        overflow: hidden;
        flex-direction: column;

        margin-bottom: 16px;

        border-radius: 8px;
        box-shadow: var(--sc-shadow-elevation-1dp);
      }

      .two-cards {
        display: grid;

        margin-right: 1vw;
        margin-left: 1vw;

        justify-content: center;
        grid-template-columns: repeat(2, minmax(240px, 1fr));
        grid-gap: 3% 2%;
      }

      figure {
        position: relative;

        overflow: hidden;

        height: 480px;
        margin: 0;
      }

      img {
        height: 100%;

        object-fit: cover;
      }

      figcaption {
        font-size: 0.8em;
        font-weight: 600;

        position: absolute;
        right: 0;
        bottom: 0;

        box-sizing: border-box;
        width: 100%;
        padding: 16px;

        text-align: right;
        letter-spacing: 0.5px;

        color: white;
        background-color: rgba(0, 0, 0, 0.5);

        backdrop-filter: blur(2px);
      }

      .card-content {
        display: flex;
        flex-direction: column;

        background: var(--sc-secondary-background-color);

        justify-content: space-between;
        flex: 1;
      }

      .card-text {
        padding: 6% 4% 0;
      }

      .card-actions {
        display: flex;

        min-height: 52px;
        padding: 4%;

        align-items: flex-end;
        justify-content: flex-end;
      }

      .link-button {
        font-weight: 600;

        display: inline-flex;

        box-sizing: border-box;
        min-width: 64px;
        height: 36px;
        padding: 0 15px 2px;

        text-decoration: none;
        letter-spacing: var(--sc-caps-letter-spacing);

        color: var(--sc-primary-accent-color-dark);
        border: 1px solid var(--sc-primary-accent-color);
        border-radius: 4px;

        align-items: center;
        justify-content: center;
        font-variant-caps: all-small-caps;
        background-color: inherit;
        transition: background-color 0.2s ease;
      }

      .link-button:hover {
        background-color: var(--sc-primary-accent-color-light-transparent);
        transition: background-color 0.2s ease;
      }

      .link-button:active {
        color: white;
        background-color: var(--sc-primary-accent-color);
        transition: background-color 0.2s ease;
      }

      h2 {
        font-family: var(--sc-serif-font);
        font-size: var(--sc-skolar-font-size-static-subtitle);
        font-weight: 400;
        line-height: 1.3333;

        margin: 0 0 0 0;
      }

      p {
        font-size: var(--sc-skolar-font-size-md);
        line-height: 1.5;

        margin: 0.75em 0 0 0;
      }

      a {
        text-decoration: none;
      }

      .video {
        display: flex;

        height: 360px;

        justify-content: center;
      }

      video {
        border-radius: 8px;
        box-shadow: var(--sc-shadow-elevation-1dp);
      }

      @media (max-width: 680px) {
        .two-cards {
          display: flex;
          flex-direction: column;

          margin-right: 0;
          margin-left: 0;

          grid-gap: 0;
        }

        video {
          width: 100%;
        }

        br {
          content: '';
        }

        h2 {
          font-weight: 500;
        }
      }

      .top-two {
        display: flex;
        flex-direction: row;

        min-height: 360px;

        margin: 48px 1vw;

        flex-wrap: nowrap;
        justify-content: space-around;
        gap: 1em;
      }

      @media (max-width: 1120px) {
        .top-two {
          flex-wrap: wrap;
        }
      }

      .top-two .plain {
        margin-top: 0;
      }

      .sc-related {
        display: flex;
        flex-direction: column;

        margin: 4% 1vw;

        gap: 1vw;
      }

      .sc-related article {
        color: var(--sc-primary-text-color);
        background-color: var(--sc-secondary-background-color);

        flex: 1;
      }

      .sc-related article header {
        display: flex;

        height: 80px;
        padding: 1rem;

        color: white;

        justify-content: space-between;
      }

      .sc-related a {
        text-decoration: underline;

        text-decoration-color: rgba(255, 255, 255, 0);

        transition: text-decoration-color 0.2s ease;
      }

      .sc-related a:hover {
        transition: text-decoration-color 0.2s ease;

        text-decoration-color: rgba(255, 255, 255, 0.6);
      }

      .sc-related article img {
        width: 72px;
      }

      .sc-related article header h3 {
        font-size: var(--sc-skolar-font-size-l);
        font-family: var(--sc-sans-font);
        font-weight: 600;

        margin: 0;

        text-align: end;

        display: flex;
        flex-direction: column;
      }

      .sc-related-item-subtitle {
        font-weight: 400;
        font-style: italic;
      }

      .related-projects-content {
        margin: 0.5em 0 1.5em 0;
      }

      .sc-related article p {
        padding: 0 1em 0 1em;
      }

      .sc-related article ul {
        margin: 0.75em 0 0 0;
        padding: 0 0 0 2em;
      }

      .sc-related article li::marker {
        color: var(--sc-disabled-text-color);
      }

      .sc-related-items-wrapper {
        display: flex;
        flex-direction: row;

        justify-content: center;
        flex-wrap: wrap;
        gap: 1em;
      }

      .secondary-accent header {
        background-color: var(--sc-secondary-accent-color);
      }

      .dark-accent header {
        background-color: rgb(75, 74, 73);
      }

      .primary-accent header {
        background-color: rgb(59, 118, 59);
      }

      .primary-color header {
        background-color: rgb(161, 108, 0);
      }

      .related-projects-heading {
        margin: 0 1em;
        padding-left: 1em;

        border-bottom: 2px solid var(--sc-border-color);
      }

      .related-projects-heading h2 {
        font-family: var(--sc-sans-font);

        letter-spacing: var(--sc-caps-letter-spacing);

        font-variant-caps: all-small-caps;

        color: var(--sc-secondary-text-color);
      }

      @media (max-width: 1120px) {
        .sc-related article {
          min-width: 40%;
        }
      }

      @media (max-width: 560px) {
        .sc-related article {
          min-width: 80%;
        }
      }

      .people,
      .speaker {
        fill: white;
        transform: scale(2);
        margin: 1rem;
      }

      .bilara {
        fill: white;
        width: 60px;
        height: 60px;
      }
    `;
  }

  firstUpdated() {
    this._getRandomQuote();
  }

  async _getRandomQuote() {
    const getRandomEl = arr => arr[Math.floor(Math.random() * arr.length)];

    const epigraphResponse = await (await fetch(`${API_ROOT}/epigraphs`)).json();
    this.randomEpigrah = getRandomEl(epigraphResponse);
    const whyReadResponse = await (await fetch(`${API_ROOT}/whyweread`)).json();
    this.whyWeRead = getRandomEl(whyReadResponse);
  }

  render() {
    return html`
      <main>
        <section class="tipitaka-section">
          <h2>
            Tipiṭaka—
            <i>the</i>
            Three Baskets
            <i>of the</i>
            Buddhist canon
          </h2>
        </section>
        <sc-tipitaka></sc-tipitaka>

        <section class="top-two">
          <section class="video">
            <video
              title="SuttaCentral promotional video 2020"
              width="640"
              height="360"
              controls
              preload="none"
              style=""
              poster="/img/home-page/video_overlay.jpg"
            >
              <source
                src="https://ia601508.us.archive.org/20/items/sutta-central-promo-2020-en.av-1/SuttaCentral_Promo-2020_en.av1.mp4"
              />
              <source
                src="https://ia601508.us.archive.org/12/items/sutta-central-promo-2020-en-vp-9/SuttaCentral_Promo-2020_en_VP9.webm"
              />
              <source
                src="https://ia801504.us.archive.org/23/items/sutta-central-promo-2020-en-x-264/SuttaCentral_Promo-2020_en_x264.mp4"
              />
            </video>
          </section>
          <section class="plain" style="min-height: 134px">
            <p>${unsafeHTML(this.localize('2797e2ab111cd1d938bd327b38002092'))}</p>
            <p>${unsafeHTML(this.localize('9db604c6c61c4cb7431619341bc037bf'))}</p>
          </section>
        </section>

        <section class="plain quotation">
          <h2>${unsafeHTML(this.localize('6fa47a464d90ac462faad21974edfb66'))}</h2>
          <blockquote>
            <span>${this.randomEpigrah ? this.randomEpigrah.epigraph : ''}</span>
          </blockquote>
          <a
            class="link-button quote-button ripple"
            href="${this.randomEpigrah ? '/' + this.randomEpigrah.uid : ''}"
          >
            Read this sutta
          </a>
        </section>

        <section class="two-cards">
          <article>
            <figure>
              <picture>
                <source srcset="/img/home-page/pali1.avif" type="image/avif" />
                <img src="/img/home-page/pali1.jpg" alt="Pali manuscript" style="width:100%" />
              </picture>
              <figcaption>Palm leaf (ola) manuscript from Sri Lanka</figcaption>
            </figure>
            <div class="card-content">
              <div class="card-text">
                <h2>${this.localize('742e700832d62bb2f6a17592968b4dab')}</h2>
                <p>${this.localize('0ae097eff8e01d83a486582e1648d803')}</p>
              </div>
              <div class="card-actions">
                <a href="/introduction" class="link-button">Introduction</a>
              </div>
            </div>
          </article>

          <article>
            <figure>
              <picture>
                <source srcset="/img/home-page/koreana.avif" type="image/avif" />
                <img
                  src="/img/home-page/koreana.jpg"
                  alt="Chinese Buddhist woodblock"
                  style="width:100%"
                />
              </picture>
              <figcaption>A block from the Tripiṭaka Koreana at Haeinsa Temple</figcaption>
            </figure>
            <div class="card-content">
              <div class="card-text">
                <h2>${this.localize('a5172cf2c34de3fc8e2af331ac915ec9')}</h2>
                <p>${this.localize('72b2622af85398029ea11349175e83af')}</p>
              </div>
              <div class="card-actions">
                <a href="/start" class="link-button">Get started</a>
              </div>
            </div>
          </article>
        </section>

        <section class="sc-related">
          <div class="related-projects-heading">
            <h2>Related projects</h2>
          </div>
          <div class="sc-related-items-wrapper">
            <article class="card dark-accent">
              <a
                href="https://voice.suttacentral.net/scv/index.html#/sutta"
                target="_blank"
                rel="noopener"
                title="Visit SuttaCentral Voice"
              >
                <header>
                  <span>${icon.speaker}</span>
                  <h3>
                    <span>SuttaCentral Voice</span>
                    <span class="sc-related-item-subtitle">listen to suttas</span>
                  </h3>
                </header>
              </a>
              <div class="related-projects-content">
                <p>
                  Voice makes SuttaCentral’s texts and translations accessible to the visually
                  impaired and the sighted. The suttas began as an oral transmission, and now they
                  are an oral transmission again.
                </p>
                <ul>
                  <li>Find Suttas on Voice.</li>
                  <li>Or on SuttaCentral, click the speaker icon on Sutta cards.</li>
                </ul>
              </div>
            </article>
            <article class="card secondary-accent">
              <a
                href="https://buddhanexus.net/"
                target="_blank"
                rel="noopener"
                title="Visit BuddhaNexus"
              >
                <header>
                  <span>
                    <picture>
                      <source srcset="/img/home-page/buddhanexus_logo.avif" type="image/avif" />
                      <img src="/img/home-page/buddhanexus_logo.png" alt="Buddhanexus logo" />
                    </picture>
                  </span>
                  <h3>
                    <span>BuddhaNexus</span>
                    <span class="sc-related-item-subtitle">mapping suttas with AI</span>
                  </h3>
                </header>
              </a>
              <div class="related-projects-content">
                <p>
                  Cutting-edge application of neural nets to explore hidden relations between
                  Buddhist texts. Pali texts are from SuttaCentral. Taking the idea of parallels a
                  step further, this technology opens up possibilities of deeper insights into the
                  evolution of texts of all traditions and periods.
                </p>
              </div>
            </article>
            <article class="card primary-color">
              <a
                href="https://discourse.suttacentral.net/"
                target="_blank"
                rel="noopener"
                title="Visit SuttaCentral forum"
              >
                <header>
                  <span>${icon.people}</span>
                  <h3>
                    <span>Discuss & Discover</span>
                    <span class="sc-related-item-subtitle">SuttaCentral forum</span>
                  </h3>
                </header>
              </a>
              <div class="related-projects-content">
                <p>
                  Join our vibrant and friendly community of Sutta lovers. Absolute beginners and
                  learned experts all get to learn from each other.
                </p>
                <ul>
                  <li>Share your experiences</li>
                  <li>Ask questions</li>
                  <li>Find talks, chanting, books, and articles.</li>
                </ul>
              </div>
            </article>
            <article class="card primary-accent">
              <a
                href="https://bilara.suttacentral.net/"
                target="_blank"
                rel="noopener"
                title="Visit Bilara translation webapp"
              >
                <header>
                  <span>${icon.bilara}</span>
                  <h3>
                    <span>Bilara</span>
                    <span class="sc-related-item-subtitle">computer assisted translation</span>
                  </h3>
                </header>
              </a>
              <div class="related-projects-content">
                <p>
                  Built from the ground up by SuttaCentral, Bilara is a web interface for Sutta
                  translation. Our team is using it to create new translations of Suttas in the
                  world’s languages.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section class="plain quotation">
          <h2>Why we read</h2>
          <blockquote>
            <span>${this.whyWeRead}</span>
          </blockquote>
          <a
            class="link-button quote-button"
            href="https://discourse.suttacentral.net/t/why-we-read-tell-us-why-you-read-suttas/6747"
          >
            Testimonies
          </a>
        </section>

        <section class="two-cards">
          <article>
            <figure>
              <picture>
                <source srcset="/img/home-page/pali6.avif" type="image/avif" />
                <img
                  src="/img/home-page/pali6.jpg"
                  alt="Pali manuscript from Myanmar"
                  style="width:100%"
                />
              </picture>
              <figcaption>Pali manuscript from Myanmar</figcaption>
            </figure>
            <div class="card-content">
              <div class="card-text">
                <h2>${this.localize('078365b3da2eb8b34d23c36661309359')}</h2>
                <p>${unsafeHTML(this.localize('2e64b76d5549e9dc3e83c5845571322a'))}</p>
              </div>
              <div class="card-actions">
                <a href="/general-guide-sujato" class="link-button">Guides</a>
              </div>
            </div>
          </article>

          <article>
            <figure>
              <picture>
                <source srcset="/img/home-page/bhikkhuni.avif" type="image/avif" />
                <img src="/img/home-page/bhikkhuni.jpg" alt="Pali manuscript" style="width:100%" />
              </picture>
              <figcaption>
                Bhikkhuni-patimokkha, Burmese manuscript, 19th century. British Library
              </figcaption>
            </figure>
            <div class="card-content">
              <div class="card-text">
                <h2>${this.localize('149842aa5477edb219ce272ec2aab269')}</h2>
                <p>${this.localize('70a49d1ca4c56cd629f76e90d6b6cc0f')}</p>
              </div>
              <div class="card-actions">
                <a href="/subjects" class="link-button">Indexes</a>
              </div>
            </div>
          </article>
        </section>
      </main>
    `;
  }

  constructor() {
    super();
    this.localizedStringsPath = '/localization/elements/static_home-page';
  }
}

customElements.define('home-page', SCHomePage);
