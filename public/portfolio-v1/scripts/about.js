'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

document.querySelector('.app').onload = load();

function load() {
    var Cards = function () {
        function Cards(el) {
            _classCallCheck(this, Cards);

            this.cards = Array.from(el);
            this.initCard();
        }

        _createClass(Cards, [{
            key: 'initCard',
            value: function initCard() {
                var _this = this;

                this.highlightCard = function (e) {
                    e.target.querySelector('h2 a span').classList.add('heartbeat');
                };
                this.unhighlightCard = function (e) {
                    e.target.querySelector('h2 a span').classList.remove('heartbeat');
                };
                this.cards.forEach(function (c) {
                    c.addEventListener('mouseenter', _this.highlightCard);
                    c.addEventListener('mouseleave', _this.unhighlightCard);
                });
            }
        }]);

        return Cards;
    }();
    //VALUES CHART


    var values__holder = document.getElementById('chart__values'),
        values__chart = new Chart(values__holder, {
        type: 'polarArea',
        data: {
            labels: ['Créativité', 'Innovation', 'Logique', 'Qualité', 'Détails'],
            datasets: [{
                label: 'Mes valeurs',
                data: [90, 70, 90, 100, 90],
                backgroundColor: ['rgba(219,241,250,0.5)', 'rgba(167,215,234,0.5)', 'rgba(120,186,211,0.5)', 'rgba(80,154,182,0.5)', 'rgba(50,125,153,0.5)'],
                borderColor: ['rgba(219,241,250,1)', 'rgba(167,215,234,1)', 'rgba(120,186,211,1)', 'rgba(80,154,182,1)', 'rgba(50,125,153,1)'],
                borderWidth: 2
            }]
        },
        options: {
            maintainAspectRatio: true,
            layout: {
                padding: {
                    top: 5
                }
            },
            scale: {
                ticks: {
                    beginAtZero: true,
                    stepSize: 20,
                    min: 0,
                    max: 100
                }
            },
            legend: {
                position: 'right',
                labels: {
                    boxWidth: 10
                }
            },
            tooltips: {
                backgroundColor: '#327d99'
            }
        }
    });

    //SKILLS DEV CHART
    //Front/Back chart
    var dev__holder = document.getElementById('chart__dev'),
        dev__chart = new Chart(dev__holder, {
        type: 'bar',
        data: {
            labels: ['', '', '', '', '', ''],
            datasets: [{
                label: '',
                data: [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: ['rgba(255, 99, 132, 0.2)', 'rgba(54, 162, 235, 0.2)', 'rgba(255, 206, 86, 0.2)', 'rgba(75, 192, 192, 0.2)', 'rgba(153, 102, 255, 0.2)', 'rgba(255, 159, 64, 0.2)', 'rgba(32, 178, 170, 0.2)', 'rgba(160, 46, 15, 0.2)'],
                borderColor: ['rgba(255,99,132,1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)', 'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)', 'rgba(32, 178, 170, 1)', 'rgba(160, 46, 15, 0.7)'],
                borderWidth: 1
            }]
        },
        options: {
            maintainAspectRatio: true,
            scales: {
                yAxes: [{
                    beginAtZero: true,
                    ticks: {
                        stepSize: 20,
                        min: 0,
                        max: 100,
                        autoSkip: false
                    }
                }],
                xAxes: [{
                    stacked: false,
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        min: 0,
                        autoSkip: false
                    }
                }]
            },
            legend: {
                display: false
            },
            tooltips: {
                backgroundColor: '#8d2136'
            }
        }
    });

    //Full stack chart
    var dev__holder2 = document.getElementById('chart__dev2'),
        dev__chart2 = new Chart(dev__holder2, {
        type: 'radar',
        data: {
            labels: ['HTML', 'CSS/SASS', 'Bootstrap', 'jQuery', 'Angular', 'React', 'Ionic', 'JavaScript', 'PHP', 'Laravel', 'MySQL', 'NodeJS', 'Express'],
            datasets: [{
                label: 'Front-end',
                data: [90, 90, 70, 90, 55, 30, 70, 80, 0, 0, 0, 0, 0],
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255,99,132,1)',
                borderWidth: 2,
                lineTension: 0.2
            }, {
                label: 'Back-end',
                data: [0, 0, 0, 0, 0, 0, 0, 80, 80, 50, 80, 70, 30],
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                lineTension: 0.2
            }]
        },
        options: {
            maintainAspectRatio: true,
            scale: {
                ticks: {
                    display: false,
                    beginAtZero: true,
                    stepSize: 20,
                    min: 0,
                    max: 100
                }
            },
            legend: {
                display: true,
                position: 'right',
                labels: {
                    boxWidth: 10
                }
            },
            tooltips: {
                backgroundColor: '#8d2136'
            }
        }
    });

    //SKILLS ART CHART
    var art__holder = document.getElementById('chart__art'),
        art__chart = new Chart(art__holder, {
        type: 'bar',
        data: {
            labels: ['Photoshop', 'Illustrator', 'Indesign', 'After Effects', 'Premiere Pro', 'Muse'],
            datasets: [{
                label: '',
                data: [90, 90, 80, 60, 65, 50],
                backgroundColor: ['rgba(255, 99, 132, 0.2)', 'rgba(54, 162, 235, 0.2)', 'rgba(255, 206, 86, 0.2)', 'rgba(75, 192, 192, 0.2)', 'rgba(153, 102, 255, 0.2)', 'rgba(255, 159, 64, 0.2)'],
                borderColor: ['rgba(255,99,132,1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)', 'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            maintainAspectRatio: true,
            layout: {
                padding: {
                    bottom: 15,
                    right: 30
                }
            },
            scales: {
                yAxes: [{
                    beginAtZero: true,
                    ticks: {
                        stepSize: 20,
                        min: 0,
                        max: 100,
                        autoSkip: false
                    }
                }],
                xAxes: [{
                    stacked: false,
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        min: 0,
                        autoSkip: false
                    }
                }]
            },
            legend: {
                display: false
            },
            tooltips: {
                backgroundColor: '#8d2136'
            }
        }
    });

    //INTERACTIONS
    document.querySelectorAll('.app__chart__nav a').forEach(function (a) {
        a.addEventListener('click', showChart);
    });

    function showChart(e) {
        e.preventDefault();
        var whatChart = this.getAttribute('id'),
            label = [],
            data = [],
            data2 = [{
            label: 'Front-end',
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255,99,132,1)',
            borderWidth: 2,
            lineTension: 0.2
        }, {
            label: 'Back-end',
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            lineTension: 0.2
        }],
            option = {};
        switch (whatChart) {
            case 'back':
                label = ['PHP', 'Laravel', 'MySQL', 'JavaScript', 'NodeJS', 'Express'];
                data = [80, 80, 50, 80, 70, 30];
                updateCSS('chart__dev', 'chart__dev2', whatChart);
                updateChart(dev__chart, label, data, 'Back-end');
                updateChart2(dev__chart2, data2);
                break;
            case 'front':
                label = ['HTML', 'CSS/SASS', 'Bootstrap', 'jQuery', 'Angular', 'React', 'Ionic', 'JavaScript'];
                data = [90, 90, 70, 90, 55, 30, 70, 80];
                updateCSS('chart__dev', 'chart__dev2', whatChart);
                updateChart(dev__chart, label, data, 'Front-end');
                updateChart2(dev__chart2, data2);
                break;
            case 'fullstack':
                data2 = [{
                    label: 'Front-end',
                    data: [90, 90, 70, 90, 55, 30, 70, 80, 0, 0, 0, 0, 0],
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255,99,132,1)',
                    borderWidth: 2,
                    lineTension: 0.2
                }, {
                    label: 'Back-end',
                    data: [0, 0, 0, 0, 0, 0, 0, 80, 80, 50, 80, 70, 30],
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    lineTension: 0.2
                }];
                updateCSS('chart__dev2', 'chart__dev', whatChart);
                updateChart2(dev__chart2, data2);
                updateChart(dev__chart, [''], [''], '');
                break;
            default:
                break;
        }
    }

    function updateChart(chart, label, data, name) {
        // //remove old options 
        chart.data.labels = [];
        chart.data.datasets['0'].data = [];

        //update with new data
        chart.data.datasets['0'].label = name;
        label.forEach(function (e) {
            chart.data.labels.push(e);
        });
        data.forEach(function (e) {
            chart.data.datasets['0'].data.push(e);
        });
        chart.update();
    }

    function updateChart2(chart, data) {
        chart.data.datasets = data;
        chart.update();
    }

    function updateCSS(showDiv, hideDiv, selectedA) {
        document.getElementById(hideDiv).classList.add('hidden');
        document.getElementById(showDiv).classList.remove('hidden');
        document.querySelectorAll('.app__chart__nav a').forEach(function (a) {
            a.classList.remove('selected');
        });
        document.getElementById(selectedA).classList.add('selected');
    }

    //ANIMATION & FX
    var rellax = new Rellax('.rellax', {
        speed: -2,
        center: false,
        round: true,
        vertical: true,
        horizontal: false
    });

    //RESPONSIVE
    //Fixe stupid chart display blugs
    fixChartDisplayBug();

    function fixChartDisplayBug() {

        if (window.innerWidth >= 720) {
            document.querySelector('.hobbies div figure:nth-child(2) figcaption').innerHTML = 'Cyber<br>sécurité';
            document.querySelector('.hobbies div figure:nth-child(3) figcaption').innerHTML = 'Techno<br>logies';
        }

        window.addEventListener('resize', function (e) {
            if (window.innerWidth >= 720) {
                document.querySelector('.hobbies div figure:nth-child(2) figcaption').innerHTML = 'Cyber<br>sécurité';
                document.querySelector('.hobbies div figure:nth-child(3) figcaption').innerHTML = 'Techno<br>logies';
            }
        });
    };

    var cards = new Cards(document.querySelectorAll('.app__content__card.skills'));
};