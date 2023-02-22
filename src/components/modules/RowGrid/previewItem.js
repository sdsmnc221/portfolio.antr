/**
 * Class representing a Preview Item (.preview__item)
 */
export class PreviewItem {
  // DOM elements
  DOM = {
    // main element (.preview__item)
    el: null,
    // title (.preview__item-title)
    title: null,
    // grid (.grid)
    grid: null,
    // images (.cell__img)
    images: null,
    // (.preview__content)
    content: null,
    // (.preview__video)
    video: null,
    // (.preview__hashtags)
    hashtags: null,
    // (.preview-button)
    button: null,
  };

  /**
   * Constructor.
   * @param {Element} DOM_el - main element (.preview__item)
   */
  constructor(DOM_el) {
    this.DOM.el = DOM_el;
    this.DOM.title = this.DOM.el.querySelector('.preview__item-title > .oh__inner');
    this.DOM.grid = this.DOM.el.querySelector('.grid');
    this.DOM.images = [...this.DOM.grid.querySelectorAll('.cell__img')];
    this.DOM.content = this.DOM.el.querySelector('.preview__content');
    this.DOM.video = this.DOM.el.querySelector('.preview__video');
    this.DOM.hashtags = this.DOM.el.querySelector('.preview__hashtags');
    this.DOM.button = this.DOM.el.querySelector('.preview-button');
  }
}
