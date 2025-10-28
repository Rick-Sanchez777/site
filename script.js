document.addEventListener('DOMContentLoaded', () => {
    // --- ЗМІННІ SPLASH SCREEN ---
    const splashScreen = document.getElementById('splash-screen');
    const loadingDuration = 1000; 

    // --- Змінні DOM-елементів (Залишаємо як було) ---
    const specialtyItems = document.querySelectorAll('.specialty-item');
    const courseButtons = document.querySelectorAll('.course-button');
    const backToCoursesButton = document.getElementById('back-to-courses');
    const initialMessage = document.querySelector('.initial-message');
    const courseSelection = document.querySelector('.course-selection');
    const groupListContainer = document.querySelector('.group-list-container');
    const scheduleDisplayContainer = document.getElementById('schedule-view-container');
    const mainContent = document.querySelector('.main-content');
    const groupsGrid = document.getElementById('groups-grid');
    const currentSpecialtyName = document.getElementById('current-specialty-name');
    const currentGroupInfo = document.getElementById('current-group-info');
    const displayGroupName = document.getElementById('display-group-name');
    const subGroupButtons = document.querySelectorAll('.sub-group-button');
    const weekButtons = document.querySelectorAll('.week-button'); 
    const scheduleTable = document.getElementById('schedule-table');
    const homeIcon = document.querySelector('.schedule-title-block i.fa-home');
    const historyIcon = document.querySelector('.schedule-title-block i.fa-history');
    const themeToggleIcon = document.querySelector('.theme-toggle-icon');
    const refreshIcon = document.querySelector('.refresh-icon');
    const body = document.body;

    // --- ГЛОБАЛЬНІ ДАНІ РОЗКЛАДУ ТА СТАН ---
    let activeSpecialty = '';
    let activeCourse = '';
    let activeGroup = '';
    let activeSubgroup = 'I';
    let activeWeek = 'odd'; 
    let allScheduleData = {}; // Глобальне сховище для завантажених даних (ГРУПИ + РОЗКЛАД)

    // ✅ КАРТА API-ПОСИЛАНЬ (Перетворено на API-посилання /gviz/tq)
    const INSTITUTE_API_MAP = {
        // Формат: https://docs.google.com/spreadsheets/d/ID_ТАБЛИЦІ/gviz/tq?tqx=out:json&gid=ID_АРКУША
        // ННІ ДТД: ID: 1lUxFRBSow9W-i3-za4evFw8Lc0Is7KUo, GID: 653856022
        "ННІ ДТД": "https://docs.google.com/spreadsheets/d/1dd2pDcbvha_I6B52LAK3T8EcJDX-wLJu/gviz/tq?tqx=out:json&gid=126447992", // туда нах
        // ННІ ІМАКІТ: ID: 1xg2GxizX1QM3noIXFQa_meT9BflJ71j7, GID: 1146905197
        "ННІ ІМАКІТ": "https://docs.google.com/spreadsheets/d/e/2PACX-1vSgtXDF_Kgw5MUQRMtVheI32hzjybnmFCjwag3cI7wsQVIHMAzYGJSPVYdMYvodFg/pubhtml",
        // ННІ КНІТ: ID: 1XKACsOMTPH6dr56wxAZObJrKxIOfHCsQ04rW74HJLDc, GID: 0
        "ННІ КНІТ": "https://docs.google.com/spreadsheets/d/1XKACsOMTPH6dr56wxAZObJrKxIOfHCsQ04rW74HJLDc/gviz/tq?tqx=out:json&gid=0",
        // ННІ ЛСПГ: ID: 1qktqUIAObzGYDtR5tg4077QF8sfWrDEg, GID: 1016221573
        "ННІ ЛСПГ": "https://docs.google.com/spreadsheets/d/1qktqUIAObzGYDtR5tg4077QF8sfWrDEg/gviz/tq?tqx=out:json&gid=1016221573",
        // ННІ БММ: ID: 1N9L2ghRW6_yp27fCycl_fb9ZHCz8pYHy, GID: 1821046924
        "ННІ БММ": "https://docs.google.com/spreadsheets/d/1N9L2ghRW6_yp27fCycl_fb9ZHCz8pYHy/gviz/tq?tqx=out:json&gid=1821046924",
        // ННІ СНАП: ID: 1X_YuvNeAg8KGdcM12G2HUrzKBaBS86E0, GID: 1203641941
        "ННІ СНАП": "https://docs.google.com/spreadsheets/d/1X_YuvNeAg8KGdcM12G2HUrzKBaBS86E0/gviz/tq?tqx=out:json&gid=1203641941",
    };

    // --- ФУНКЦІЯ ПЕРЕТВОРЕННЯ ДАНИХ (ОНОВЛЕНО ДЛЯ ГОРИЗОНТАЛЬНОГО ФОРМАТУ) ---
    /**
     * Парсить сирі дані з Google Таблиці у зручний об'єкт: { groups: {...}, schedule: {...} }
     * Ця логіка написана для горизонтального формату (групи в стовпцях).
     * @param {Object} rawData - сирі дані від Google API.
     * @param {string} currentInstitute - назва інституту.
     */
    function processGoogleData(rawData, currentInstitute) {
        const groups = {};
        const schedule = {};
        const cols = rawData.table.cols;
        const rows = rawData.table.rows;
        
        // Мапа для перетворення днів тижня
        const dayMap = {
            'Понеділок': 'Mon', 'Вівторок': 'Tue', 'Середа': 'Wed', 
            'Четвер': 'Thu', 'П’ятниця': 'Fri'
        };

        // 1. Зчитуємо метадані: назви груп, курси та індекси стовпців
        const groupColumns = [];
        
        // Індекси груп починаються з 3-ї колонки (індекс 3) після Дні[0], Час[1], Тиждень[2]
        for (let i = 3; i < cols.length; i++) { 
            const label = cols[i].label;
            // Перевірка назви групи (наприклад, АКТ-11, КН-101/1)
            if (label && label.match(/[А-Яа-яA-Za-z]+-\d+[А-Яа-яA-Za-z]*\/?[12]?/)) { 
                const groupName = label.replace(/\/1|\/2/, ''); 
                const subgroup = label.includes('/1') ? 'I' : (label.includes('/2') ? 'II' : 'common');
                const courseMatch = groupName.match(/\d/);
                const course = courseMatch ? groupName.replace(/\D/g, '')[0] : '1'; // Перша цифра з назви групи
                
                groupColumns.push({ 
                    index: i, 
                    group: groupName, 
                    subgroup: subgroup, 
                    course: course 
                });

                if (!groups[currentInstitute]) groups[currentInstitute] = {};
                if (!groups[currentInstitute][course]) groups[currentInstitute][course] = new Set();
                
                groups[currentInstitute][course].add(groupName);
            }
        }
        
        // Перетворюємо Set на Array
        for (const course in groups[currentInstitute]) {
            groups[currentInstitute][course] = Array.from(groups[currentInstitute][course]);
        }

        // 2. Зчитуємо дані по рядках
        let currentDay = ''; 

        rows.forEach(row => {
            const cells = row.c;
            
            // КОРЕКЦІЯ ІНДЕКСІВ: 
            const dayCell = cells[0]?.v || cells[0]?.f;      // Колонка А: Дні
            const timeCell = cells[1]?.v || cells[1]?.f;     // Колонка B: Час
            const weekCell = cells[2]?.v || cells[2]?.f;     // Колонка C: н/п (Тиждень)

            if (dayCell && dayCell.length > 1 && dayCell.trim().toLowerCase() !== 'дні') { 
                currentDay = dayCell.trim();
            }
            
            // ЛОГІКА ВИЗНАЧЕННЯ ТИЖНЯ: 'н' - odd, 'п' - even, порожньо/інше - odd і even.
            let lessonWeeks = [];
            const weekType = weekCell ? weekCell.trim().toLowerCase() : '';
            
            if (weekType.includes('н')) {
                lessonWeeks = ['odd']; // Непарний
            } else if (weekType.includes('п')) {
                lessonWeeks = ['even']; // Парний
            } else {
                // Якщо порожньо або інше (наприклад, 'з'), вважаємо обидва тижні.
                lessonWeeks = ['odd', 'even']; 
            }

            // Пропускаємо рядок, якщо немає часу або не визначено день.
            if (!timeCell || !dayMap[currentDay]) return;

            const time = timeCell.replace(/-/g, '–');
            const dayKey = dayMap[currentDay];

            // Проходимо по стовпцях груп
            groupColumns.forEach(col => {
                const lessonCell = cells[col.index]?.v || cells[col.index]?.f;
                
                if (!lessonCell || lessonCell.trim() === '') return;

                const groupName = col.group;

                if (!schedule[groupName]) {
                    schedule[groupName] = { odd: {}, even: {} };
                }
                
                // Вміст клітинки: Назва предмета
                const title = lessonCell.split(',')[0].trim(); 
                // Вміст клітинки: Викладач, ауд, тип (все інше)
                let details = lessonCell.substring(title.length).replace(/,/, '').trim();
                
                // ЗАПИСУЄМО У ВСІ ВИЗНАЧЕНІ ТИЖНІ
                lessonWeeks.forEach(week => {
                    if (!schedule[groupName][week][time]) {
                        schedule[groupName][week][time] = {};
                    }
                    
                    schedule[groupName][week][time][dayKey] = {
                        title: title,
                        details: details,
                        subgroup: col.subgroup
                    };
                });
            });
        });

        // Повертаємо об'єкт у форматі: { groups: { 'ННІ КНІТ': {'1': ['КН-101'], ...} }, schedule: { 'КН-101': {...} } }
        return { groups: { [currentInstitute]: groups[currentInstitute] }, schedule: schedule };
    }
    
    // --- ФУНКЦІЯ ЗАВАНТАЖЕННЯ ДАНИХ З GOOGLE ТАБЛИЦІ ---
    async function fetchScheduleData(instituteName) {
        const apiURL = INSTITUTE_API_MAP[instituteName];
        
        if (!apiURL) {
            console.warn(`API-посилання для ${instituteName} не налаштовано.`);
            // Повертаємо пусті дані, якщо API не налаштовано
            return { groups: { [instituteName]: {} }, schedule: {} };
        }

        try {
            console.log(`Завантаження даних для ${instituteName} з API: ${apiURL}`);
            const response = await fetch(apiURL);
            const text = await response.text();
            
            // Очищення тексту: Google обгортає JSON у "google.visualization.Query.setResponse(...)"
            const jsonMatch = text.match(/google.visualization.Query.setResponse\((.*)\)/s);
            if (!jsonMatch) throw new Error("Некоректний формат JSON від Google або помилка доступу. Перевірте публікацію таблиці.");
            
            const jsonString = jsonMatch[1];
            const rawData = JSON.parse(jsonString);
            
            // Обробка даних у зручний формат
            const processedData = processGoogleData(rawData, instituteName); 

            return processedData; 
            
        } catch (error) {
            console.error(`Помилка завантаження даних для ${instituteName}:`, error);
            alert("Не вдалося завантажити розклад. Перевірте публікацію таблиці, GID та консоль.");
            
            // Повертаємо пусті дані в разі помилки
            return { groups: { [instituteName]: {} }, schedule: {} };
        }
    }

    // --- ЛОГІКА SPLASH SCREEN (Залишаємо як було) ---
    const hideSplashScreen = () => {
        splashScreen.classList.add('fade-out');
        setTimeout(() => {
            splashScreen.style.display = 'none';
        }, 500); 
    };
    
    // --- Функція loadSchedule (Без змін, використовує allScheduleData) ---
    const loadSchedule = () => {
        if (!scheduleTable || !activeGroup || !allScheduleData.schedule) {
            scheduleTable.innerHTML = `<p class="message-error">Оберіть групу або перевірте наявність даних.</p>`;
            return;
        }

        // Зберігаємо поточний стан
        localStorage.setItem('activeSpecialty', activeSpecialty);
        localStorage.setItem('activeCourse', activeCourse);
        localStorage.setItem('activeGroup', activeGroup);
        localStorage.setItem('activeSubgroup', activeSubgroup);
        localStorage.setItem('activeWeek', activeWeek);

        const groupSchedule = allScheduleData.schedule[activeGroup];
        if (!groupSchedule) {
            scheduleTable.innerHTML = `<p class="message-error">Розклад для групи ${activeGroup} не знайдено в завантажених даних.</p>`;
            return;
        }

        const weekLabel = activeWeek === 'odd' ? 'Непарний' : 'Парний';
        const currentSchedule = groupSchedule[activeWeek] || {};
        
        if (displayGroupName) {
             displayGroupName.textContent = activeGroup;
        }
        
        // HTML генерується, як і раніше
        let scheduleHTML = `
            <p style="margin-top: 10px; padding: 20px 0; border-top: 1px solid var(--color-border); width: 100%;">
                <strong style="color: var(--color-accent);">${activeGroup}</strong> (${activeSpecialty}, ${activeCourse} Курс)<br>
                <span style="font-size: 14px; color: var(--color-text-subtle);">
                    Поточні параметри: **Підгрупа ${activeSubgroup}**, **Тиждень: ${weekLabel}**.
                </span>
            </p>
        `;

        scheduleHTML += `
            <table class="schedule-table">
                <thead>
                    <tr>
                        <th class="time-col">Час</th>
                        <th>Понеділок</th>
                        <th>Вівторок</th>
                        <th>Середа</th>
                        <th>Четвер</th>
                        <th>П'ятниця</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const times = Object.keys(currentSchedule).sort(); 

        times.forEach(time => {
            scheduleHTML += `<tr><td class="time-col">${time}</td>`;

            days.forEach(day => {
                const lesson = currentSchedule[time][day];
                
                if (lesson) {
                    const isCommon = lesson.subgroup === 'common';
                    const isCorrectSubgroup = lesson.subgroup === activeSubgroup;

                    if (isCommon || isCorrectSubgroup) {
                        scheduleHTML += `
                            <td class="lesson-cell">
                                <span class="lesson-title">${lesson.title}</span>
                                <span class="lesson-details">${lesson.details}</span>
                            </td>
                        `;
                    } else {
                        scheduleHTML += `<td class="free-time"></td>`;
                    }

                } else {
                    scheduleHTML += `<td class="free-time"></td>`;
                }
            });

            scheduleHTML += `</tr>`;
        });

        scheduleHTML += `
                </tbody>
            </table>
        `;

        scheduleTable.innerHTML = scheduleHTML;
    };


    // --- Функція updateContentDisplay (Без змін) ---
    const updateContentDisplay = (state, data = {}) => {
        // ... (Тут ваша логіка управління DOM, без змін) ...
        initialMessage.classList.add('hidden');
        courseSelection.classList.add('hidden');
        groupListContainer.classList.add('hidden');
        scheduleDisplayContainer.classList.add('hidden');
        
        if (state === 'initial') {
            mainContent.classList.add('centered-content');
        } else {
            mainContent.classList.remove('centered-content');
        }

        switch (state) {
            case 'initial':
                initialMessage.classList.remove('hidden');
                activeSpecialty = '';
                activeCourse = '';
                activeGroup = '';
                specialtyItems.forEach(s => s.classList.remove('selected'));
                courseButtons.forEach(btn => btn.classList.remove('selected'));
                localStorage.clear(); 
                break;

            case 'courses':
                courseSelection.classList.remove('hidden');
                activeSpecialty = data.specialty;
                currentSpecialtyName.textContent = activeSpecialty;
                
                if (!data.keepCourseSelection) {
                    courseButtons.forEach(btn => btn.classList.remove('selected'));
                    activeCourse = '';
                }
                
                document.querySelector(`.specialty-item[data-specialty="${activeSpecialty}"]`)?.classList.add('selected');
                break;

            case 'groups':
                groupListContainer.classList.remove('hidden');
                activeSpecialty = data.specialty;
                activeCourse = data.course;
                currentGroupInfo.textContent = `${activeSpecialty}, ${activeCourse} Курс`;
                
                if (allScheduleData.groups[activeSpecialty]) {
                    renderGroups(activeSpecialty, activeCourse);
                } else {
                    groupsGrid.innerHTML = `<p class="message-error">Помилка: Дані груп для ${activeSpecialty} не завантажено. Оберіть інший інститут.</p>`;
                }

                courseButtons.forEach(btn => btn.classList.remove('selected'));
                document.querySelector(`.course-button[data-course="${activeCourse}"]`)?.classList.add('selected');

                document.querySelectorAll('.group-button').forEach(btn => btn.classList.remove('selected'));
                if (activeGroup) {
                    document.querySelector(`.group-button[data-group="${activeGroup}"]`)?.classList.add('selected');
                }
                break;

            case 'schedule_page': 
                activeGroup = data.group;
                activeSpecialty = data.specialty || activeSpecialty;
                activeCourse = data.course || activeCourse;

                scheduleDisplayContainer.classList.remove('hidden'); 
                displayGroupName.textContent = activeGroup;

                activeSubgroup = data.subgroup || activeSubgroup;
                activeWeek = data.week || activeWeek;

                subGroupButtons.forEach(btn => btn.classList.remove('selected'));
                document.querySelector(`.sub-group-button[data-subgroup="${activeSubgroup}"]`)?.classList.add('selected');
                
                weekButtons.forEach(btn => btn.classList.remove('selected'));
                document.querySelector(`.week-button[data-week="${activeWeek}"]`)?.classList.add('selected');

                if (activeGroup) {
                    loadSchedule();
                }
                break;
        }
    };

    // --- Функція renderGroups (Без змін, використовує allScheduleData) ---
    const renderGroups = (specialty, course) => {
        // Використовуємо дані з allScheduleData.groups
        const groupsForCourse = allScheduleData.groups[specialty] ? (allScheduleData.groups[specialty][course] || []) : [];
        groupsGrid.innerHTML = '';
        
        if (groupsForCourse.length === 0) {
            groupsGrid.innerHTML = `<p style="color:var(--color-text-subtle);">На жаль, груп для цього курсу не знайдено. Перевірте Таблицю.</p>`;
            return;
        }

        groupsForCourse.forEach(groupName => {
            const button = document.createElement('button');
            button.className = 'group-button';
            button.textContent = groupName;
            button.dataset.group = groupName;

            if (groupName === activeGroup) {
                button.classList.add('selected');
            }

            button.addEventListener('click', () => {
                document.querySelectorAll('.group-button').forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
                
                updateContentDisplay('schedule_page', { 
                    specialty: specialty, 
                    course: course,     
                    group: groupName,
                    subgroup: activeSubgroup, 
                    week: activeWeek 
                });
            });
            groupsGrid.appendChild(button);
        });
    };

    // --- loadSavedState (ОНОВЛЕНО: очікує завершення завантаження) ---
    const loadSavedState = async () => {
        activeSpecialty = localStorage.getItem('activeSpecialty');
        activeCourse = localStorage.getItem('activeCourse');
        activeGroup = localStorage.getItem('activeGroup');
        activeSubgroup = localStorage.getItem('activeSubgroup') || 'I';
        activeWeek = localStorage.getItem('activeWeek') || 'odd';

        // Завантаження даних, якщо є збережена спеціальність
        if (activeSpecialty) {
            const data = await fetchScheduleData(activeSpecialty);
            // allScheduleData повинна бути об'єднана, оскільки fetchScheduleData може повернути лише дані для одного інституту
            allScheduleData = { 
                groups: { ...allScheduleData.groups, ...data.groups },
                schedule: { ...allScheduleData.schedule, ...data.schedule }
            };
        }

        if (activeGroup && activeSpecialty && activeCourse) {
            updateContentDisplay('schedule_page', { 
                specialty: activeSpecialty, 
                course: activeCourse, 
                group: activeGroup,
                subgroup: activeSubgroup,
                week: activeWeek
            });
        } else if (activeSpecialty && activeCourse) {
             updateContentDisplay('groups', { specialty: activeSpecialty, course: activeCourse });
        } else if (activeSpecialty) {
             updateContentDisplay('courses', { specialty: activeSpecialty, keepCourseSelection: false });
        } else {
            updateContentDisplay('initial');
        }
    }


    // --- ІНІЦІАЛІЗАЦІЯ ОБРОБНИКІВ ПОДІЙ ---

    // 1. Обробник для Спеціальності (ОНОВЛЕНО: Завантажує дані)
    specialtyItems.forEach(item => {
        item.addEventListener('click', async () => {
            specialtyItems.forEach(s => s.classList.remove('selected'));
            item.classList.add('selected');
            const selectedSpecialty = item.dataset.specialty;

            // Скидаємо збережені дані перед завантаженням нових
            activeCourse = '';
            activeGroup = '';
            
            // ЗАВАНТАЖЕННЯ ДАНИХ З GOOGLE API
            const data = await fetchScheduleData(selectedSpecialty);
            allScheduleData = { 
                groups: { ...allScheduleData.groups, ...data.groups },
                schedule: { ...allScheduleData.schedule, ...data.schedule }
            };
            
            updateContentDisplay('courses', { specialty: selectedSpecialty, keepCourseSelection: false });
        });
    });

    // ... (Інші обробники залишаються як було) ...
    subGroupButtons.forEach(button => {
        button.addEventListener('click', () => {
            subGroupButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            activeSubgroup = button.dataset.subgroup;
            loadSchedule(); 
        });
    });

    weekButtons.forEach(button => {
        button.addEventListener('click', () => {
            weekButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            activeWeek = button.dataset.week; 
            loadSchedule(); 
        });
    });

    courseButtons.forEach(button => {
        button.addEventListener('click', () => {
            courseButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');

            const selectedCourse = button.dataset.course;
            const currentSpecialty = document.querySelector('.specialty-item.selected')?.dataset.specialty || activeSpecialty;

            if (currentSpecialty) {
                activeGroup = ''; 
                updateContentDisplay('groups', { specialty: currentSpecialty, course: selectedCourse });
            }
        });
    });

    backToCoursesButton.addEventListener('click', () => {
        updateContentDisplay('courses', { specialty: activeSpecialty, keepCourseSelection: true });
        document.querySelector(`.course-button[data-course="${activeCourse}"]`)?.classList.add('selected');
    });

    if (homeIcon) {
        homeIcon.addEventListener('click', () => {
            updateContentDisplay('initial');
        });
    }

    if (historyIcon) {
        historyIcon.addEventListener('click', () => {
            if (activeSpecialty && activeCourse) {
                 updateContentDisplay('groups', { specialty: activeSpecialty, course: activeCourse });
            } else {
                 updateContentDisplay('initial');
            }
        });
    }

    if (refreshIcon) {
        refreshIcon.addEventListener('click', () => {
            window.location.reload(); 
        });
    }

    // ЛОГІКА ЗМІНИ ТЕМИ (Залишаємо як було)
    if (themeToggleIcon) {
        // ... Ваша існуюча логіка зміни теми ...
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            themeToggleIcon.classList.remove('fa-sun');
            themeToggleIcon.classList.add('fa-moon');
        } else {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            themeToggleIcon.classList.remove('fa-moon');
            themeToggleIcon.classList.add('fa-sun');
        }

        themeToggleIcon.addEventListener('click', () => {
            const isDark = body.classList.contains('dark-theme');
            
            if (isDark) {
                body.classList.remove('dark-theme');
                body.classList.add('light-theme');
                themeToggleIcon.classList.remove('fa-sun');
                themeToggleIcon.classList.add('fa-moon');
                localStorage.setItem('theme', 'light');
            } else {
                body.classList.remove('light-theme');
                body.classList.add('dark-theme');
                themeToggleIcon.classList.remove('fa-moon');
                themeToggleIcon.classList.add('fa-sun');
                localStorage.setItem('theme', 'dark');
            }
        });
    }
    
    // Ініціалізація
    setTimeout(() => {
        hideSplashScreen();
        loadSavedState(); 
    }, loadingDuration);

});


