import { css, html } from "lit-element";

export const SCSiteLayoutStyles = css`
  :host {
    display: block;
  }

  .nav-logo-icon {
    margin-left: var(--sc-size-md);
    margin-right: var(--sc-size-md);
    vertical-align: text-bottom;
    width: var(--sc-size-lg);
    height: var(--sc-size-lg);
  }

  /* styles for the text dialogs: */

  .dialog {
    left: 0;
    background-color: var(--sc-secondary-background-color);
    white-space: initial;
    max-width: 630px;
    position: fixed;
    top: 50px;
    margin: 5% auto;
    right: 0;
  }

  @media screen and (max-width: 960px) {
    .dialog {
      left: 0;
    }
  }

  @media screen and (max-width: 480px) {
    #titlebarSitetitle {
      font-size: 1.8rem !important;
    }

    #titlebarSubtitle {
      font-size: 1.05rem !important;
    }
  }

  .dialog-header {
    font-family: var(--sc-sans-font);
    font-size: var(--sc-skolar-font-size-static-subtitle);
    font-weight: 400;
    line-height: 32px;
    padding: var(--sc-size-lg) 0;
    color: var(--sc-tertiary-text-color);
    margin: 0;
  }

  .buttons-bar {
    margin-top: 0;
    padding-right: 0;
    display: flex;
    justify-content: space-between;
  }

  .green-bg {
    background-color: var(--sc-primary-accent-color);
  }

  .scrollable-dialog {
    margin-bottom: var(--sc-size-lg);
    margin-top: 0;
    --divider-color: transparent;
  }

  .dialog-section {
    margin-top: var(--sc-size-lg);
    color: var(--sc-primary-text-color);
    font-family: var(--sc-sans-font);
    font-size: var(--sc-skolar-font-size-s);
    font-weight: 400;
    line-height: 20px;
  }

  .dialog-section p[lang="ev"] {
    font-family: var(--sc-tengwar-font);
  }

  p a,
  li a {
    color: inherit;
    text-decoration: underline;
    text-decoration-color: var(--sc-primary-color);
    text-decoration-skip-ink: auto;
  }

  p a:hover,
  li a:hover {
    color: var(--sc-primary-color);
  }

  p a:visited,
  li a:visited {
    text-decoration-color: var(--sc-primary-color-dark);
  }

  .close-dialog-icon {
    color: var(--sc-tertiary-text-color);
    margin: var(--sc-size-sm);
  }

  .navigation-menu {
    height: 100%;
  }

  #titlebar {
    display: flex;
    box-sizing: border-box;
    height: 8em;
    margin: auto;

    background-color: var(--sc-primary-color);

    justify-content: center;
    transition: all 0.1s;
  }

  #titlebarSitetitle {
    white-space: nowrap;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    margin: 0;
  }

    #titlebarSitetitle h1 {
    font-size: 3.5rem;
    font-family: var(--sc-serif-font);
    font-variant-caps: small-caps;
    font-weight: 300;
    line-height: 1;
    margin: 0;
  }

  #titlebarSubtitle {
    font-style: italic;
    font-size: 1.5rem;
    display: flex;
    justify-content: center;
    margin-left: 1em;
  }

  #universal-toolbar {
    color: white;
    position: sticky;
    top: 0;
    box-shadow: var(--sc-shadow-elevation-2dp);
    z-index: 9999;
  }

  #titlebarCenter {
    min-width: 0;
  }

  #context-toolbar {
    height: 3.5em;
    display: flex;
    background-color: var(--sc-primary-color);
    padding: 0 2%;
  }

  #context-toolbar span:first-child {
    margin-right: auto;
  }

  #toolbarTitle {
    font-weight: normal;
    display: flex;
    align-items: center;
    font-family: var(--sc-sans-font);
    font-size: calc(20px * var(--sc-skolar-font-scale));
    color: var(--sc-tertiary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: calc(80%);
  }

  #titlebarCenter span a {
    color: var(--sc-tertiary-text-color);
    text-decoration: none;
  }

  titlebar {
    background-color: var(--sc-primary-color);
  }

  @media screen and (max-width: 600px) {
    #toolbar_title {
      font-size: var(--sc-skolar-font-size-md);
    }
  }

  @media print {
    #universal-toolbar,
    titlebar {
      display: none;
    }
  }

  .title-logo-icon {
    height: var(--sc-size-xxl);
    width: var(--sc-size-xxl);
    margin: 0 var(--sc-size-sm);
  }

  @media (max-width: 600px) {
    h1 {
      font-size: var(--sc-skolar-font-size-xxl);
      padding-top: 0.2em;
    }
    .title-logo-icon {
      height: 40px;
      width: 40px;
    }
    .subtitle {
      font-size: var(--sc-skolar-font-size-md);
      margin-bottom: 0.5em;
    }
    #titlebarSitetitle {
      padding-top: 0.4em;
    }
  }

  #static_pages_nav_menu {
    background-color: var(--sc-primary-color-dark);
  }

  nav {
    display: flex;
    overflow-x: auto;
    flex-direction: row;
    box-sizing: border-box;
    padding: 0 calc(2% - 8px);
    white-space: nowrap;
  }

  ul {
    display: flex;
    width: 100%;
    margin: 0;
    padding: 0;
  }

  li {
    font-size: var(--sc-skolar-font-size-xs);
    font-weight: 500;
    list-style-type: none;
    align-items: center;
    letter-spacing: var(--sc-caps-letter-spacing);
    text-transform: uppercase;
    margin-right: 8px;
  }

  li a {
    position: relative;
    display: inline-block;
    padding: 14px 8px 10px;
    text-decoration: none;
    border-bottom: 4px solid rgba(0,0,0,0);
    opacity: .8;
    color: var(--sc-tertiary-text-color);
  }

  li a:hover {
    color: var(--sc-tertiary-text-color);
    cursor: pointer;
    border-bottom: 4px solid var(--sc-primary-color-light);
    opacity: 1;
  }

  .staticPageSelected {
    opacity: 1;
    border-bottom: 4px solid var(--sc-primary-color-light);
  }

  morph-ripple {
    --ripple-color: gold;
  }

  .transitionTransform {
    transition: transform 200ms ease-in-out;
  }
`;
