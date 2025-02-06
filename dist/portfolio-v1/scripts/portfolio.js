'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

document.querySelector('.app').onload = load();

function load() {
    var Grid = function () {
        function Grid(el) {
            var _this = this;

            _classCallCheck(this, Grid);

            this.grid = Macy({
                container: el,
                margin: { x: 16, y: 16 },
                trueOrder: true,
                mobileFirst: true,
                columns: 1,
                breakAt: {
                    500: 3,
                    700: 4
                }
            });
            this.gridItems = [];
            Array.from(document.querySelectorAll(el + ' .item')).forEach(function (item) {
                _this.gridItems.push(new GridItem(item));
            });

            this.enableGridRecalculate();
        }

        _createClass(Grid, [{
            key: 'enableGridRecalculate',
            value: function enableGridRecalculate() {
                var _this2 = this;

                this.recalculateGrid = function (e) {
                    _this2.grid.recalculate(true);
                    _this2.grid.reInit();
                };
                this.gridItems.forEach(function (item) {
                    item.gridItemFooter.footerToggleButton.addEventListener('click', _this2.recalculateGrid);
                });
            }
        }]);

        return Grid;
    }();

    var GridItem = function () {
        function GridItem(el) {
            _classCallCheck(this, GridItem);

            this.gridItem = el;
            this.initGridItem();
        }

        _createClass(GridItem, [{
            key: 'initGridItem',
            value: function initGridItem() {
                this.gridItemFooter = new GridItemFooter(this.gridItem.querySelector('footer'));
            }
        }]);

        return GridItem;
    }();

    var GridItemFooter = function () {
        function GridItemFooter(el, grid) {
            _classCallCheck(this, GridItemFooter);

            this.grid = grid;
            this.gridItemFooter = el;
            this.footerTags = Array.from(this.gridItemFooter.querySelectorAll('a')).filter(function (tag) {
                return !tag.classList.contains('more');
            });
            this.footerToggleButton = this.gridItemFooter.querySelector('a.more');
            this.initGridItemFooter();
        }

        _createClass(GridItemFooter, [{
            key: 'initGridItemFooter',
            value: function initGridItemFooter() {
                this.enableToggleTags();
                window.addEventListener('resize', this.enableToggleTags);
            }
        }, {
            key: 'enableDisplayToggleButton',
            value: function enableDisplayToggleButton() {
                var _this3 = this;

                //Show MORE button if total tags width exceed footer width
                var winW = document.body.clientWidth;
                this.footerW = this.gridItemFooter.offsetWidth - 50;
                if (winW > 700) {
                    this.footerW = this.footerW / 4;
                } else if (winW > 500) {
                    this.footerW = this.footerW / 3;
                }
                this.totalTagsW = 0;
                this.footerTags.forEach(function (tag) {
                    _this3.totalTagsW += tag.clientWidth;
                });
                if (this.totalTagsW > this.footerW) {
                    this.footerToggleButton.classList.remove('hidden');
                } else {
                    this.footerToggleButton.classList.add('hidden');
                }
            }
        }, {
            key: 'enableToggleTags',
            value: function enableToggleTags() {
                var _this4 = this;

                this.collapseTags = function (e) {
                    e.preventDefault();
                    _this4.gridItemFooter.style.height = '2rem';
                    _this4.footerToggleButton.classList.remove('less');
                    _this4.footerToggleButton.classList.add('more');
                    _this4.footerToggleButton.removeEventListener('click', _this4.collapseTags);
                    _this4.footerToggleButton.addEventListener('click', _this4.expandTags);
                };

                this.expandTags = function (e) {
                    e.preventDefault();
                    _this4.tagsNb = _this4.footerTags.length;
                    if (_this4.tagsNb / 2 > 1) {
                        _this4.gridItemFooter.style.height = 2 * Math.ceil(_this4.tagsNb / 2) + 'rem';
                        _this4.footerToggleButton.classList.remove('more');
                        _this4.footerToggleButton.classList.add('less');
                        _this4.footerToggleButton.addEventListener('click', _this4.collapseTags);
                    } else {
                        if (_this4.tagsNb / 2 === 1 && window.innerWidth < 420) {
                            _this4.gridItemFooter.style.height = 2 * _this4.tagsNb + 'rem';
                            _this4.footerToggleButton.classList.remove('more');
                            _this4.footerToggleButton.classList.add('less');
                            _this4.footerToggleButton.addEventListener('click', _this4.collapseTags);
                        } else {
                            _this4.footerToggleButton.classList.add('hidden');
                        }
                    }
                };

                this.enableDisplayToggleButton();
                this.footerToggleButton.addEventListener('click', this.expandTags);
            }
        }]);

        return GridItemFooter;
    }();

    var grid = new Grid('.grid');
};