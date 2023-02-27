/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 19);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */,
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */,
/* 5 */,
/* 6 */,
/* 7 */,
/* 8 */,
/* 9 */,
/* 10 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return Toolbar; });
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Toolbar = function () {
    function Toolbar(el) {
        _classCallCheck(this, Toolbar);

        this.toolbar = $(el);
        this.init();
    }

    _createClass(Toolbar, [{
        key: 'init',
        value: function init() {
            this.initPagination();
            this.initFilter();
            this.initCSVFilter();
        }
    }, {
        key: 'initPagination',
        value: function initPagination() {
            var _this = this;

            this.toolbar.pagination = this.toolbar.find('.pagination .ui.dropdown');
            this.toolbar.pagination.dropdown();

            this.toolbar.currentPage = this.toolbar.find('.current-page')[0];
            this.toolbar.menu = $(this.toolbar.currentPage).siblings('.menu');
            this.toolbar.pageNbs = this.toolbar.find('.item[data-tab^="page"]');
            this.toolbar.pageNbs.tab();
            this.toolbar.pageNbs.on('click', function (e) {
                $(_this.toolbar.currentPage).html($(e.target).text());
            });
        }
    }, {
        key: 'initFilter',
        value: function initFilter() {
            var _this2 = this;

            this.toolbar.filter.btn = this.toolbar.find('.filter');
            this.toolbar.filter.btn.popup({
                inline: true,
                hoverable: true
            });

            this.toolbar.filter.node = this.toolbar.filter.btn.parent();
            this.toolbar.filter.node.on('mouseover', function (e) {
                var btn = _this2.toolbar.filter.btn;
                btn.addClass('positive');
            });
            this.toolbar.filter.node.on('mouseout', function (e) {
                var btn = _this2.toolbar.filter.btn;
                btn.removeClass('positive');
            });

            this.toolbar.filter.criteria = Array.from(this.toolbar.find('.filter + .popup .grid .column')).map(function (criterion) {
                return {
                    group: criterion,
                    master: $(criterion).find('.master'),
                    children: Array.from($(criterion).find('.child'))
                };
            });
            this.toolbar.filter.criteria.forEach(function (criterion, index) {
                //Master checkbox's behaviours
                $(criterion.master).checkbox({
                    //On checked : check all children checkboxes
                    onChecked: function onChecked() {
                        criterion.children.forEach(function (child) {
                            $(child).checkbox('check');
                        });
                    },
                    //On unchecked : uncheck all children checkboxes
                    onUnchecked: function onUnchecked() {
                        criterion.children.forEach(function (child) {
                            $(child).checkbox('uncheck');
                        });
                    }
                });

                //Children checkboxes' behaviours
                criterion.children.forEach(function (child) {
                    $(child).checkbox({
                        // Fire on load to set parent value
                        fireOnInit: true,
                        // Change parent state on each child checkbox change
                        onChange: function onChange(e) {
                            var criteria = _this2.toolbar.filter.criteria[index],
                                allChecked = true,
                                allUnchecked = true;
                            // check to see if all other siblings are checked or unchecked
                            criteria.children.forEach(function (child) {
                                if ($(child).checkbox('is checked')) {
                                    allUnchecked = false;
                                } else {
                                    allChecked = false;
                                }
                            });
                            // set parent checkbox state, but dont trigger its onChange callback
                            if (allChecked) {
                                $(criteria.master).checkbox('set checked');
                            } else if (allUnchecked) {
                                $(criteria.master).checkbox('set unchecked');
                            } else {
                                $(criteria.master).checkbox('set indeterminate');
                            }
                        }
                    });
                });
            });

            //AJAX
            this.toolbar.filter.btn.on('click', function (e) {
                e.preventDefault();
                _this2.toolbar.filter.criteria.forEach(function (criterion, index) {
                    ajax_data.filter_criteria[index].values = [];
                    criterion.children.forEach(function (child) {
                        if ($(child).checkbox('is checked')) {
                            var _n = $(child).find('label').first().text(),
                                _v = $(child).find('input').first().attr('name'),
                                _value = {};
                            _value[_n] = _v;
                            ajax_data.filter_criteria[index].values.push(_value);
                        }
                    });
                });
                var _data = { data: ajax_data },
                    url = window.location.href;
                url += url.charAt(url.length - 1) === '/' ? 'filter' : '/filter';
                $.ajaxSetup({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="_token"]').attr('content')
                    }
                });
                $.ajax({
                    url: url,
                    type: 'POST',
                    dataType: 'json',
                    data: _data,
                    success: function success(data) {
                        if (data.table) {
                            //Update table
                            var table = new DOMParser().parseFromString(data.table, 'text/html');
                            table = $(table).find('table');

                            //Bulk enable post-treatment ???
                            if (!_data.data.is_bulk) {
                                [].concat(_toConsumableArray(table.find('th')), _toConsumableArray(table.find('td'))).filter(function (col) {
                                    return $(col).find('input[type="checkbox"]').length > 0;
                                }).forEach(function (col) {
                                    return $(col).remove();
                                });
                            }

                            $('table').html(table.html());

                            //Update pagination
                            _this2.updatePagination();
                        } else {
                            console.log(data);
                        }
                    }
                });
            });
        }
    }, {
        key: 'initCSVFilter',
        value: function initCSVFilter() {
            var _this3 = this;

            this.toolbar.csv = {};
            this.toolbar.csv.btns = {
                all: $('.button.csv__all'),
                positive: $('.button.csv__positive'),
                warning: $('.button.csv__warning'),
                negative: $('.button.csv__negative'),
                none: $('.button.csv__none'),
                logs: $('.button.csv__logs')
            };

            this.toolbar.csv.data = {};
            this.toolbar.csv.logs = {};

            this.toolbar.csv.data.positive = Array.from($('table tr.positive'));
            this.toolbar.csv.data.warning = Array.from($('table tr.warning'));
            this.toolbar.csv.data.negative = Array.from($('table tr.negative'));
            this.toolbar.csv.data.none = Array.from($('table tr.none'));

            var _loop = function _loop(type) {
                _this3.toolbar.csv.btns[type].on('click', function (e) {
                    e.preventDefault();
                    _this3.csvFilter(type);
                });
            };

            for (var type in this.toolbar.csv.btns) {
                _loop(type);
            }

            console.log(this.toolbar.csv);
        }
    }, {
        key: 'csvFilter',
        value: function csvFilter(type) {
            if (_.values(_.pick(this.toolbar.csv.btns, ['positive', 'warning', 'negative'])).every(function (btn) {
                return !$(btn).hasClass('basic');
            })) {
                this.toolbar.csv.btns.all.removeClass('blue');
            } else {
                this.toolbar.csv.btns.all.addClass('blue');
            }

            switch (type) {
                case 'all':
                    for (var _type in _.pick(this.toolbar.csv.btns, ['positive', 'warning', 'negative'])) {
                        this.toolbar.csv.btns[_type].removeClass('basic');
                        Array.from($('table tr')).forEach(function (tr) {
                            return $(tr).removeClass('hide');
                        });
                    }
                    break;
                case 'logs':
                    break;
                default:
                    if (this.toolbar.csv.btns[type].hasClass('basic')) {
                        this.toolbar.csv.btns[type].removeClass('basic');
                        this.toolbar.csv.data[type].forEach(function (tr) {
                            return $(tr).removeClass('hide');
                        });
                    } else {
                        this.toolbar.csv.btns[type].addClass('basic');
                        this.toolbar.csv.data[type].forEach(function (tr) {
                            return $(tr).addClass('hide');
                        });
                    }
                    break;
            }
        }
    }, {
        key: 'updatePagination',
        value: function updatePagination() {
            var _this4 = this;

            //Counting pages
            this.toolbar.pageNbs = Array.from($('table tbody')).length;
            //Update HTML
            $(this.toolbar.currentPage).html('1');
            var template = '';
            for (var i = 1; i <= this.toolbar.pageNbs; i++) {
                template += '<a class="' + (i === 1 ? 'active' : '') + ' item" data-tab="page-' + i + '"> ' + i + ' </a>';
            }
            $(this.toolbar.menu).html(template);
            //Update behaviours
            this.toolbar.pageNbs = this.toolbar.find('.item[data-tab^="page"]');
            this.toolbar.pageNbs.tab();
            this.toolbar.pageNbs.on('click', function (e) {
                $(_this4.toolbar.currentPage).html($(e.target).text());
            });
        }
    }]);

    return Toolbar;
}();



/***/ }),
/* 11 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return Table; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__toolbar__ = __webpack_require__(10);
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }



var Table = function () {
    function Table(el) {
        var customToolbar = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

        _classCallCheck(this, Table);

        this.table = $(el);
        this.init(customToolbar);
    }

    _createClass(Table, [{
        key: 'init',
        value: function init(customToolbar) {
            this.table.toolbar = customToolbar ? new __WEBPACK_IMPORTED_MODULE_0__toolbar__["a" /* Toolbar */](customToolbar) : new __WEBPACK_IMPORTED_MODULE_0__toolbar__["a" /* Toolbar */](this.table.prev('.toolbar'));
            this.initCellTooltip();
        }
    }, {
        key: 'initCellTooltip',
        value: function initCellTooltip() {
            this.table.cells = this.table.find('.has-data');
            this.table.cells.popup();
        }
    }]);

    return Table;
}();



/***/ }),
/* 12 */,
/* 13 */,
/* 14 */,
/* 15 */,
/* 16 */,
/* 17 */,
/* 18 */,
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(20);
__webpack_require__(25);
module.exports = __webpack_require__(26);


/***/ }),
/* 20 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__components_cuform__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__components_sidebar__ = __webpack_require__(24);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__components_table__ = __webpack_require__(11);
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

//Import Classes & Services.




//Once document is ready, init the app (the book).
window.onload = function () {
    build();
};

function build() {
    //_app's core
    var App = function () {
        function App(el) {
            _classCallCheck(this, App);

            this.app = el;
            this.init();
        }

        _createClass(App, [{
            key: 'init',
            value: function init() {
                this.app.sidebar = new __WEBPACK_IMPORTED_MODULE_1__components_sidebar__["a" /* Sidebar */](this.app.querySelector('.app__sidebar'));
                if (this.app.querySelector('table')) this.app.table = new __WEBPACK_IMPORTED_MODULE_2__components_table__["a" /* Table */](this.app.querySelector('table'));
                if (this.app.querySelector('.form.cu')) this.app.cuform = new __WEBPACK_IMPORTED_MODULE_0__components_cuform__["a" /* CUForm */](this.app.querySelector('.form.cu'));
            }
        }]);

        return App;
    }();

    var _app = new App(document.querySelector('.app'));
    return _app;
};

/***/ }),
/* 21 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CUForm; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__cumodal__ = __webpack_require__(22);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__services_helper__ = __webpack_require__(23);
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }




var CUForm = function () {
    function CUForm(el) {
        _classCallCheck(this, CUForm);

        this.form = $(el);
        this.init();
    }

    _createClass(CUForm, [{
        key: 'init',
        value: function init() {
            this.form.content = this.form.find('.form__content').first();
            this.initFormBtns();
            this.initFormController();
            this.initModal();
        }
    }, {
        key: 'initFormBtns',
        value: function initFormBtns() {
            this.form.btns = {}; //Array.from(this.form.find('.form__btns button'));
            this.initAddBtn();
            this.initResetBtn();
            this.initSubmitBtn();
            this.initUploadBtn();
            this.initOtherFields();
        }
    }, {
        key: 'initDropdownFields',
        value: function initDropdownFields() {
            Array.from(this.form.find('.ui.dropdown').dropdown());
        }
    }, {
        key: 'initAddBtn',
        value: function initAddBtn() {
            var _this = this;

            var fieldsTemplate = this.form.find('.fields').first().wrap('').parent().html();
            this.form.btns.add = this.form.find('.add').first();
            this.form.btns.add.on('mouseover', function (e) {
                $(e.target).removeClass('disabled').addClass('primary');
            });
            this.form.btns.add.on('mouseout', function (e) {
                $(e.target).removeClass('primary');
            });
            this.form.btns.add.on('click', function (e) {
                e.preventDefault();
                _this.form.content.append(fieldsTemplate);
                _this.initFormController();
            });
        }
    }, {
        key: 'initResetBtn',
        value: function initResetBtn() {
            var _this2 = this;

            var fieldsTemplate = this.form.content.html();
            this.form.btns.reset = this.form.find('.reset').first();
            this.form.btns.reset.on('mouseover', function (e) {
                $(e.target).removeClass('disabled').addClass('primary');
            });
            this.form.btns.reset.on('mouseout', function (e) {
                $(e.target).removeClass('primary');
            });
            this.form.btns.reset.on('click', function (e) {
                e.preventDefault();
                _this2.form.content.html(fieldsTemplate);
                _this2.initFormController();
            });
        }
    }, {
        key: 'initSubmitBtn',
        value: function initSubmitBtn() {
            var _this3 = this;

            this.form.btns.submit = this.form.find('.submit').first();

            if (!window.location.href.includes('datasets')) {
                this.form.btns.submit.popup({
                    position: 'bottom left',
                    target: '.form__content',
                    context: '.form__content',
                    content: 'N\'oubliez pas de remplir tous les champs !'
                });

                this.form.btns.submit.on('click', function (e) {
                    e.preventDefault();
                    var btn = $(e.target);
                    $.when(btn.hasClass('disabled')).done(function (isBtnDisabled) {
                        if (!isBtnDisabled) _this3.callAjax(true);
                    });
                    // if (!btn.hasClass('disabled')) {
                    //     this.callAjax();
                    // }
                });
            } else {
                this.form.btns.submit.on('click', function (e) {
                    e.preventDefault();
                    var btn = $(e.target);
                    $.when(btn.hasClass('disabled')).done(function (isBtnDisabled) {
                        if (!isBtnDisabled) _this3.callAjax();
                    });
                });
            }
        }
    }, {
        key: 'initUploadBtn',
        value: function initUploadBtn() {
            var _this4 = this;

            this.form.btns.upload = this.form.find('.upload').first();
            this.form.btns.upload.desc = this.form.find('.form__file__desc').first();
            this.form.btns.upload.desc.default = this.form.btns.upload.desc.html();
            this.form.btns.upload.input = this.form.find('#form__file').first();
            this.form.btns.upload.output = this.form.find('.form__file__data').first();
            this.form.btns.upload.output.def = this.form.btns.upload.output.html();
            this.form.btns.upload.toolbar = this.form.find('.form__file__toolbar').first();
            this.form.btns.upload.toolbar.def = this.form.btns.upload.toolbar.html();
            this.form.btns.upload.on('mouseover', function (e) {
                $(e.target).addClass('primary');
            });
            this.form.btns.upload.on('mouseout', function (e) {
                $(e.target).removeClass('primary');
            });
            this.form.btns.upload.input.on('click', function (e) {
                _this4.form.btns.upload.toolbar.removeClass('loading hide').html(_this4.form.btns.upload.toolbar.def);
                _this4.form.btns.upload.output.removeClass('loading').html(_this4.form.btns.upload.output.def);
            });
            this.form.btns.upload.input.on('change', function (e) {
                var file = e.target.files[0],
                    fileReader = new FileReader();
                file.desc = '<p>' + file.name + '</p>\n                         <p>' + Object(__WEBPACK_IMPORTED_MODULE_1__services_helper__["c" /* formatBytes */])(file.size, 3) + '</p>';
                fileReader.onload = function () {
                    var data = fileReader.result;
                    if (Object(__WEBPACK_IMPORTED_MODULE_1__services_helper__["b" /* checkCSV */])(data)) {
                        _this4.form.btns.upload.output.find('.segment').addClass('loading');
                        _this4.form.btns.upload.toolbar.find('.segment').addClass('loading');
                        console.log(data);
                        Object(__WEBPACK_IMPORTED_MODULE_1__services_helper__["a" /* apiCSV */])(data, _this4.form.btns.upload.output, _this4.form.btns.upload.toolbar);
                    }
                };
                fileReader.readAsText(file);
                _this4.form.btns.upload.desc.html(file.desc);
            });
        }
    }, {
        key: 'initOtherFields',
        value: function initOtherFields() {
            //
        }
    }, {
        key: 'initFormController',
        value: function initFormController() {
            var _this5 = this;

            //Quick workaround for create dataset form, will return to this later
            if (!window.location.href.includes('datasets')) {
                if (form.type === 'create') $(this.form.btns.submit).addClass('disabled');
                this.form.content.fields = Array.from(this.form.find('.fields'));
                this.form.content.inputs = Array.from(this.form.content.find('input'));
                this.form.content.inputs.forEach(function (input) {
                    $(input).on('keyup', function (e) {
                        var input = $(e.target),
                            hasBlankField = _this5.form.content.inputs.some(function (i) {
                            return $(i).val().trim() === '';
                        });
                        if (hasBlankField) {
                            $(_this5.form.btns.submit).addClass('disabled');
                        } else {
                            $(_this5.form.btns.submit).removeClass('disabled');
                        }
                    });
                });
            }
            this.initDropdownFields();
        }
    }, {
        key: 'initModal',
        value: function initModal() {
            this.form.modal = new __WEBPACK_IMPORTED_MODULE_0__cumodal__["a" /* CUModal */](this.form.next('.modal.onSuccess'));
        }
    }, {
        key: 'callAjax',
        value: function callAjax() {
            var _this6 = this;

            var isDataset = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

            if (!isDataset) {
                console.log('l');
                var url = '/' + form.what;
                form.data = this.collectData();
                $.ajaxSetup({
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="_token"]').attr('content')
                    }
                });
                $.ajax({
                    url: url,
                    type: 'POST',
                    dataType: 'json',
                    data: form,
                    success: function success(data) {
                        console.log(data);
                        _this6.form.modal.launchModal(data);
                    },
                    error: function error(_error) {
                        console.log(_error);
                    }
                });
            } else {
                var _url = '/' + form.what;
                form.data = this.collectData(true);
                console.log(_url);
                console.log(form.data);
            }
        }
    }, {
        key: 'collectData',
        value: function collectData() {
            var isDataset = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

            if (!isDataset) {
                return _.flattenDeep(this.form.content.fields.map(function (field) {
                    return _.zipObject(form.fields_data, Array.from($(field).find('input')).map(function (input) {
                        return $(input).val().trim();
                    }));
                }));
            } else {
                return 'toto';
            }
        }
    }]);

    return CUForm;
}();



/***/ }),
/* 22 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CUModal; });
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CUModal = function () {
    function CUModal(el) {
        _classCallCheck(this, CUModal);

        this.modal = $(el);
        this.init();
    }

    _createClass(CUModal, [{
        key: 'init',
        value: function init() {
            var _this = this;

            this.modal.header = this.modal.find('.modal__header').first();
            this.modal.content = this.modal.find('.modal__content').first();
            this.modal.btns = {
                go: this.modal.find('.go.button').first(),
                stay: this.modal.find('.stay.button').first()
            };
            this.modal.btns.stay.on('click', function (e) {
                _this.modal.modal('hide');
            });
        }
    }, {
        key: 'launchModal',
        value: function launchModal(data) {
            var dict = {
                gM: ['authors', 'datasets'],
                n: {
                    authors: ['auteur.trice', 'auteur.trice.s'],
                    categories: ['catégories', 'catégorie']
                },
                v: ['ont', 'a'],
                aS: [['créé', 'modifié'], ['créée', 'modifiée']]
            },
                itemsNb = data.stored_items.length,
                isMany = itemsNb > 1 ? 0 : 1,
                isM = dict.gM.includes(data.what) ? 0 : 1,
                isCreate = data.type ? 0 : 1;
            this.modal.header.text('' + (isCreate === 0 ? 'Ajout réussi !' : 'Modification réussie !'));
            this.modal.content.html('<strong>' + itemsNb + ' ' + dict.n[data.what.replace(/\/cu/g, '')][isMany] + '</strong> \n                  ' + dict.v[isMany] + ' \xE9t\xE9 ' + dict.aS[isM][isCreate] + (isMany === 0 ? 's' : '') + ' !');
            this.modal.modal({ context: '.app__content' }).modal('show');
            this.modal.btns.go.on('click', function (e) {
                window.location = window.location.href.replace(/create|update/g, 'all');
            });
        }
    }]);

    return CUModal;
}();



/***/ }),
/* 23 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return formatBytes; });
/* unused harmony export CSVtoJSON */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return checkCSV; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return apiCSV; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__components_toolbar__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__components_table__ = __webpack_require__(11);



function formatBytes(a, b) {
    if (0 == a) return '0 Bytes';
    var c = 1024,
        d = b || 2,
        e = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
        f = Math.floor(Math.log(a) / Math.log(c));
    return parseFloat((a / Math.pow(c, f)).toFixed(d)) + ' ' + e[f];
}

function checkCSV(csv) {
    var keys = ['data_id', 'dataset_id_FK', 'id_author', 'year', 'details', 'src', 'id_bnf', 'id_wikidata', 'id_isni', 'gender', 'pseudonym', 'first_name', 'last_name', 'date_of_birth', 'date_of_death'],
        keysCSV = Papa.parse(csv).data[0];
    return _.isEqual(keys, keysCSV);
}

function CSVtoJSON(csv) {
    var json = { keys: [], data: [], raw: null };
    json.raw = Papa.parse(csv).data;
    json.keys = json.raw[0];

    json.raw.slice(1).forEach(function (d) {
        var _d = {};
        json.keys.forEach(function (k, i) {
            _d[k] = d[i];
        });
        json.data.push(_d);
    });
    console.log(json);
    return json;
}

function apiCSV(csv, outputDiv, toolbarDiv) {
    var url = "/datasets/csv",
        json = CSVtoJSON(csv);
    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="_token"]').attr('content')
        }
    });
    $.ajax({
        url: url,
        type: 'POST',
        dataType: 'json',
        data: { string: csv },
        success: function success(data) {
            console.log(data);
            toolbarDiv.html(data.toolbar);
            outputDiv.html(data.table);
            new __WEBPACK_IMPORTED_MODULE_1__components_table__["a" /* Table */](outputDiv, toolbarDiv);
        },
        error: function error(_error) {
            console.log(_error);
            toolbarDiv.addClass('hide');
            outputDiv.html("<table class=\"ui orange large padded fixed table\">\n                                <tr>\n                                <td class=\"center aligned error\">Vous avez tout cass\xE9\u2026 Je ne vous f\xE9licite pas.</td>\n                                </tr>\n                            </table>");
        }
    });
}



/***/ }),
/* 24 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return Sidebar; });
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Sidebar = function () {
    function Sidebar(el) {
        _classCallCheck(this, Sidebar);

        this.sidebar = $(el);
        this.init();
    }

    _createClass(Sidebar, [{
        key: 'init',
        value: function init() {
            this.sidebar.dropdowns = Array.from(this.sidebar.find('.ui.dropdown'));
            this.sidebar.dropdowns.forEach(function (menu) {
                $(menu).dropdown({
                    on: 'hover'
                });
            });
        }
    }]);

    return Sidebar;
}();



/***/ }),
/* 25 */
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ }),
/* 26 */
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ })
/******/ ]);