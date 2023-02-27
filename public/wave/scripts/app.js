$(document).ready(function () {
    var _types = ['Chlore', 'OxyConcentration', 'Oxygene', 'pH', 'Pression', 'Salinite', 'TempeAir', 'TempeEau'],
        t = {
        EN: ['Chlorine', 'Saturation', 'Oxygene', 'pH', 'Pressure', 'Salinity', 'Air Temp.', 'Water Temp.'],
        FR: ['Chlore', 'Saturation', 'Oxygène', 'pH', 'Pression', 'Salinité', 'Temp. d\'Air', 'Temp. d\'Eau'],
        VI: ['Clo', 'Độ bão hoà', 'Ôxy', 'pH', 'Áp suất', 'Nồng độ muối', 'Nhiệt độ không khí', 'Nhiệt độ nước']
    },
        api = '../scripts/api.php',
        loInterval = 1000 * 30; //every 30s
    var types = t[$('html').attr('lang').trim().toUpperCase()],
        lo = void 0,
        _chart = void 0;

    /*
        PAGE LOADING, TRANSITION ETC.
    */

    Barba.Pjax.init();
    Barba.Prefetch.init();
    Barba.Pjax.originalPreventCheck = Barba.Pjax.preventCheck;
    Barba.Pjax.preventCheck = function (evt, element) {
        if (!Barba.Pjax.originalPreventCheck(evt, element)) {
            return false;
        }
        if (/vi/.test(element.href.toLowerCase()) || /fr/.test(element.href.toLowerCase()) || /en/.test(element.href.toLowerCase())) {
            return false;
        }
        return true;
    };
    var transition = Barba.BaseTransition.extend({
        start: function start() {
            Promise.all([this.newContainerLoading, this.fadeOut()]).then(this.fadeIn.bind(this));
        },
        fadeOut: function fadeOut() {
            return $(this.oldContainer).animate({ opacity: 0 }).promise();
        },
        fadeIn: function fadeIn() {
            var _this = this;
            url = window.location.href.slice(23);
            document.body.scrollTop = 0;
            $('.nav-link-active').removeClass('nav-link-active');
            $('.nav-link[href=\'' + url + '\']').addClass('nav-link-active');
            $(this.oldContainer).hide();
            $(this.newContainer).css({ visibility: 'visible', opacity: 0 });
            $(this.newContainer).animate({ opacity: 1 }, 'slow', function () {
                _this.done();
            });
        }
    }),
        initPage = function initPage() {
        detectLang();
        initButtons();
        initChart();
        if (window.location.href.indexOf('contact.html') === -1 && window.location.href.indexOf('about.html') === -1) {
            initLO();
        }
    },
        detectLang = function detectLang() {
        var lang = window.location.href;
        return lang.indexOf('en') !== -1 ? 'en' : lang.indexOf('fr') !== -1 ? 'fr' : 'vi';
    },
        detectTypesLang = function detectTypesLang() {
        var lang = window.location.href;
        types = lang.indexOf('en') !== -1 ? t.EN : lang.indexOf('fr') !== -1 ? t.FR : t.VI;
    };
    Barba.Pjax.getTransition = function () {
        return transition;
    };
    Barba.Dispatcher.on('initStateChange', detectTypesLang);
    Barba.Dispatcher.on('transitionCompleted', initPage);

    /*
        TOGGLE SIDEBAR / MENU
    */

    //Unpin menu
    $('.app').on('click', '.menu .controller__sidebar', unpinMenu);

    //Pin menu
    $('.app').on('click', '.header .controller__sidebar', pinMenu);

    //Responsive
    if ($(window).width() <= 425) unpinMenu();else pinMenu();

    $(window).on('resize', function () {
        if ($(window).width() <= 425) unpinMenu();else pinMenu();
    });

    //Functions
    function unpinMenu() {
        $('.menu').css('transform', 'translateX(-110%)').removeClass('col-12 col-md-3 col-lg-2');
        $('#barba-wrapper').removeClass('col-md-9 col-lg-10');
        $('.header nav').css('margin-left', '65px');
        $('.header .controller__sidebar').removeClass('invisible');
    }

    function pinMenu() {
        $('.menu').addClass('col-12 col-md-3 col-lg-2').css('transform', 'translateX(0%)');
        $('#barba-wrapper').addClass('col-md-9 col-lg-10');
        $('.header nav').css('margin-left', '0');
        $('.header .controller__sidebar').addClass('invisible');
    }

    /*
        INIT BOOTSTRAP ELEMENTS
    */

    //Dropdown menu
    $('.dropdown-toggle').dropdown();

    //Popover
    initButtons();
    tempConvert();

    //Functions
    function initButtons() {
        $('.app .controller__refresh').on('click', function (e) {
            initLO();
        });
    }

    function tempConvert() {
        $('.card__infobox--temp').each(function (index, node) {
            var type = window.location.href.indexOf('details.html') === -1 ? $(node).find('h3').first().text().trim() : $('.controller__stats .dropdown-item.active').text().trim();
            // console.log(type);
            if (type.indexOf('Temp') !== -1 || type.indexOf('Nhiệt độ') !== -1) {
                $(node).attr('title', '' + (type.indexOf('Temp') !== -1 ? 'Conversion Celsius <-> Farenheit' : 'Đổi Celsius <-> Farenheit')).css('cursor', 'pointer').on('click', function (e) {
                    var p = $(e.currentTarget).find('p').first(),
                        degree = parseFloat(p.text().trim());
                    if (p.text().indexOf('°C') !== -1) {
                        p.html((degree * 1.8 + 32).toFixed(2) + '<span class=\'unit\'>\xB0F</span');
                    } else {
                        p.html(((degree - 32) / 1.8).toFixed(2) + '<span class=\'unit\'>\xB0C</span');
                    }
                });
            };
        });
    }

    function destroyTempConvert() {
        $('.card__infobox--temp').each(function (index, node) {
            $(node).removeAttr('type').css('cursor', 'default').off('click').removeClass('card__infobox--temp');
        });
    }

    /*
        LIVE OVERVIEW
    */
    if (window.location.href.indexOf('contact.html') === -1 && window.location.href.indexOf('about.html') === -1) {
        initLO();
    }

    function initLO() {
        $('.alert').remove();
        $('.dim').remove();
        $('.content').children().removeClass('blurred');
        if (window.location.href.indexOf('details.html') !== -1) {
            var subject = $('.controller__stats .dropdown-toggle').text().trim();
            $.ajax({
                url: api,
                dataType: 'json',
                data: { read_all: _types[types.findIndex(function (e) {
                        return e === subject;
                    })] }
            }).done(function (data) {
                //console.log('ok');
                var value = data[0].Valeurs.toFixed(2),
                    lang = detectLang();
                graphName = lang === 'en' ? '<h2>' + subject + '\'s Graph</h2>' : lang === 'fr' ? '<h2>Graphe : ' + subject + '</h2>' : '<h2>Bi\u1EC3u \u0111\u1ED3 ' + subject + '</h2>';
                $('.card--current .card__infobox p').html(subject.indexOf('Temp') !== -1 || subject.indexOf('Nhiệt độ') !== -1 ? value + '<span class=\'unit\'>\xB0C</span' : subject.indexOf('Press') !== -1 || subject.indexOf('Áp suất') !== -1 ? value + '<span class=\'unit\'>pHa</span' : value);
                $('.card--current .card__infobox h3').text(subject.toUpperCase());
                $($('.card__graph').siblings()[0]).html(graphName);
                initChart();
                // drawTable(data);
            }).fail(function (err) {
                onNoData();
            });
        } else {
            $.ajax({
                url: api,
                dataType: 'json',
                data: { read_lo: true }
            }).done(function (data) {
                $('.card__infobox').each(function (index, node) {
                    var type = $(node).find('h3').text().trim(),
                        value = data.find(function (e) {
                        return e.type === _types[types.findIndex(function (_e) {
                            return _e === type;
                        })];
                    }).Valeurs.toFixed(2);
                    $(node).find('p').html(type.indexOf('Temp') !== -1 || type.indexOf('Nhiệt độ') !== -1 ? value + '<span class=\'unit\'>\xB0C</span' : type.indexOf('Press') !== -1 || type.indexOf('Áp suất') !== -1 ? value + '<span class=\'unit\'>pHa</span' : value);
                });
                initChart();
                // drawTable(data.slice(0, 7));
            }).fail(function (err) {
                onNoData();
            });
        }
        lo = setTimeout(function () {
            initLO();
        }, loInterval);
    }

    function destroyLO() {
        clearTimeout(lo);
    }

    /*
        CHART
    */

    $('.app').on('click', '.controller__stats button.dropdown-item', function () {
        var subject = $(this).text().trim();
        //Update current active breadcrumb/dropdown-toggle
        $('.controller__stats .dropdown-toggle').text(subject);
        $('.controller__stats .dropdown-menu .dropdown-item').each(function (index, node) {
            $(node).removeClass('active');
            if ($(node).text() === subject) $(node).addClass('active');
        });
        //(re)draw the chart
        initChart(subject);

        //Data & Graphs page : Update current stat
        if (window.location.href.indexOf('details.html') !== -1) {
            initLO();
            if (subject.indexOf('Temp') !== -1 || subject.indexOf('Nhiệt độ') !== -1) {
                $('.card--current-value').addClass('card__infobox--temp');
                tempConvert();
            } else {
                destroyTempConvert();
            }
        }
    });

    //Init chart if and only if canvas#graph found on page
    initChart();

    function initChart() {
        var chart = $('.controller__stats .dropdown-toggle').text().trim(),
            type = $('');
        $('canvas#graph').hide('slow').remove();
        $('.card__graph').append('<canvas id="graph"></canvas>');
        drawChart(chart);
    }

    function onNoData() {
        var alert = document.createElement('div'),
            dim = document.createElement('div'),
            lang = detectLang(),
            text = void 0;
        text = lang === 'en' ? 'No data. Refresh the page or check database connection.' : lang === 'fr' ? 'Aucune donnée. Rechargez la page ou vérifiez la connexion vers la BDD.' : 'Không có dữ liệu. Tải lại trang hoặc kiểm tra kết nối với CSDL.';
        $('.content').children().addClass('blurred');
        $(dim).addClass('dimmed').appendTo($('.content'));
        $(alert).addClass('alert alert-danger').attr('role', 'alert').html(text).appendTo($('.content'));
    }

    function drawChart(chart) {
        var lang = detectLang();
        $.ajax({
            url: api,
            dataType: 'json',
            data: { read_all: _types[types.findIndex(function (t) {
                    return t === chart;
                })] }
        }).done(function (data) {

            if (window.location.href.indexOf('details.html') === -1) {
                drawTable(data.slice(0, 7));
            } else {
                drawTable(data);
            }

            var _data = window.location.href.indexOf('details.html') === -1 ? dataChart(data, 7) : dataChart(data, data.length),
                ctx = $('#graph'),
                config = {
                type: 'line',
                labels: _data.map(function (e) {
                    return e.x;
                }), //time
                data: {
                    datasets: [{
                        data: _data,
                        label: chart,
                        borderColor: '#03A9F4',
                        fill: false
                    }]
                },
                options: {
                    title: {
                        display: true,
                        text: lang === 'en' ? 'Last 7 ' + chart + ' stats' : lang === 'fr' ? chart + ' - Les 7 derni\xE8res valeurs' : '7 gi\xE1 tr\u1ECB cu\u1ED1i c\xF9ng c\u1EE7a ' + chart
                    },
                    scales: {
                        xAxes: [{
                            type: 'time',
                            time: {
                                parser: 'MM/DD/YYYY HH:mm',
                                unit: 'day',
                                tooltipFormat: 'll HH:mm'
                            },
                            scaleLabel: {
                                display: false, //true
                                labelString: 'Date'
                            }
                        }],
                        yAxes: [{
                            scaleLabel: {
                                display: false, //true
                                labelString: 'Value'
                            },
                            ticks: {
                                stepSize: roundToNearestMultipleOf(_data.map(function (e) {
                                    return e.y;
                                }).sort().reverse()[0]) / 10,
                                min: 0,
                                max: roundToNearestMultipleOf(_data.map(function (e) {
                                    return e.y;
                                }).sort().reverse()[0])
                            }
                        }]
                    }
                }
            };

            return new Chart(ctx, config);
        });
    }

    //Table
    function drawTable(data) {
        var template = '';
        data.forEach(function (e, i) {
            template += '<tr>\n                <th scope=\'row\'> ' + (window.location.href.indexOf('detail.html') !== -1 ? e.ID : i + 1) + ' </th>\n                <td> ' + e.Valeurs + ' </td>\n                <td> ' + date(e.time) + ' </td>\n            </tr>';
        });
        $('#table tbody').html(template);
        $('#table').parent().scrollTop(0);
    }

    //Chart helper functions
    function dataChart(data, max) {
        var _data = data.slice(0, max).map(function (e) {
            return {
                x: date(e.time), //time
                y: e.Valeurs //value
            };
        });
        return _data;
    }

    function date(dateString) {
        return moment(dateString, 'YYYY/MM/DD HH:mm').toDate();
    }

    function roundToNearestMultipleOf(x) {
        var of = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 100;

        return Math.ceil(x / of) * of;
    }
});