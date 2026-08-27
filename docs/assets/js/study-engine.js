// docs/assets/js/study-engine.js
// Study Engine V2 - محرك الدروس التفاعلي لسمر أكاديمي

const StudyEngine = (function() {
    // ===== الحالة العامة =====
    let currentLesson = null;
    let currentSectionIndex = 0;
    let currentBlockIndex = 0;
    let progress = {
        completedSections: [],
        answeredQuestions: {},
        score: 0
    };

    // ===== تحميل الدرس =====
    async function loadLesson(lessonPath) {
        try {
            const response = await fetch(lessonPath);
            if (!response.ok) throw new Error('الدرس غير موجود');
            const lesson = await response.json();
            
            // التحقق من Schema
            if (lesson.schemaVersion !== '2.0') {
                console.warn('الدرس يستخدم Schema قديم، قد لا تعمل بعض الميزات');
            }
            
            currentLesson = lesson;
            restoreProgress();
            renderLesson();
            return lesson;
        } catch (error) {
            console.error('Error loading lesson:', error);
            showError('فشل تحميل الدرس: ' + error.message);
            return null;
        }
    }

    // ===== عرض الدرس =====
    function renderLesson() {
        if (!currentLesson) return;
        
        const container = document.getElementById('lessonContainer');
        if (!container) return;

        let html = `
            <div class="study-engine">
                <!-- شريط التقدم -->
                <div class="study-progress-bar">
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${calculateProgress()}%"></div>
                    </div>
                    <span class="progress-text">${calculateProgress()}%</span>
                </div>

                <!-- رأس الدرس -->
                <div class="study-header">
                    <h1 class="study-title">${currentLesson.title || 'الدرس'}</h1>
                    ${currentLesson.learningObjectives ? `
                        <div class="study-objectives">
                            <h3>🎯 أهداف التعلم</h3>
                            <ul>
                                ${currentLesson.learningObjectives.map(obj => `<li>${obj}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>

                <!-- أقسام الدرس -->
                <div class="study-sections">
                    ${currentLesson.sections.map((section, idx) => `
                        <div class="study-section ${idx === currentSectionIndex ? 'active' : ''}" data-section="${idx}">
                            <div class="section-header" onclick="StudyEngine.goToSection(${idx})">
                                <span class="section-number">${idx + 1}</span>
                                <h2>${section.title || 'قسم'}</h2>
                                ${progress.completedSections.includes(idx) ? '<span class="section-done">✅</span>' : ''}
                            </div>
                            <div class="section-body">
                                ${section.blocks.map((block, bIdx) => renderBlock(block, bIdx)).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- أزرار التنقل -->
                <div class="study-navigation">
                    <button class="btn btn-outline" onclick="StudyEngine.prevSection()" ${currentSectionIndex === 0 ? 'disabled' : ''}>
                        ⬅️ السابق
                    </button>
                    <button class="btn btn-primary" onclick="StudyEngine.nextSection()" ${currentSectionIndex >= (currentLesson.sections?.length || 0) - 1 ? 'disabled' : ''}>
                        التالي ➡️
                    </button>
                    ${currentLesson.finalQuiz ? `
                        <button class="btn btn-gold" onclick="StudyEngine.goToQuiz()">
                            📝 الاختبار النهائي
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        container.innerHTML = html;
        saveProgress();
    }

    // ===== عرض البلوكات =====
    function renderBlock(block, index) {
        switch (block.type) {
            case 'text':
                return `<div class="block-text">${block.content}</div>`;
            
            case 'heading':
                return `<h3 class="block-heading">${block.content}</h3>`;
            
            case 'image':
                return `
                    <div class="block-image">
                        <img src="${block.content.src}" alt="${block.content.alt || ''}" loading="lazy">
                        ${block.content.caption ? `<p class="image-caption">${block.content.caption}</p>` : ''}
                    </div>
                `;
            
            case 'imageText':
                return `
                    <div class="block-image-text">
                        <div class="image-text-content">
                            ${block.content.text}
                        </div>
                        <div class="image-text-image">
                            <img src="${block.content.src}" alt="${block.content.alt || ''}" loading="lazy">
                        </div>
                    </div>
                `;
            
            case 'accordion':
                return `
                    <div class="block-accordion">
                        ${block.content.items.map((item, i) => `
                            <div class="accordion-item">
                                <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
                                    <span>${item.title}</span>
                                    <span class="accordion-icon">▼</span>
                                </div>
                                <div class="accordion-body">${item.content}</div>
                            </div>
                        `).join('')}
                    </div>
                `;
            
            case 'knowledgeCheck':
                return `
                    <div class="block-knowledge-check" data-question="${index}">
                        <div class="kc-question">${block.content.question}</div>
                        <div class="kc-options">
                            ${block.content.options.map((opt, oi) => `
                                <button class="kc-option" onclick="StudyEngine.answerKnowledgeCheck(${index}, ${oi})">
                                    ${opt}
                                </button>
                            `).join('')}
                        </div>
                        <div class="kc-feedback" id="kc-feedback-${index}"></div>
                    </div>
                `;

            case 'timeline':
                return `
                    <div class="block-timeline">
                        ${block.content.items.map((item, i) => `
                            <div class="timeline-item ${i === 0 ? 'first' : ''}">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <div class="timeline-date">${item.date}</div>
                                    <div class="timeline-title">${item.title}</div>
                                    <div class="timeline-description">${item.description || ''}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;

            case 'comparison':
                return `
                    <div class="block-comparison">
                        <table class="comparison-table">
                            <thead>
                                <tr>
                                    <th>وجه المقارنة</th>
                                    ${block.content.items.map(item => `<th>${item.title}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${block.content.criteria.map(criterion => `
                                    <tr>
                                        <td><strong>${criterion.name}</strong></td>
                                        ${criterion.values.map(val => `<td>${val}</td>`).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;

            case 'summary':
                return `
                    <div class="block-summary">
                        <h3>🧠 ماذا تعلمنا؟</h3>
                        <ul>
                            ${block.content.items.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                `;

            default:
                return `<div class="block-unknown">⚠️ نوع بلوك غير معروف: ${block.type}</div>`;
        }
    }

    // ===== التنقل بين الأقسام =====
    function goToSection(index) {
        if (index < 0 || index >= (currentLesson.sections?.length || 0)) return;
        currentSectionIndex = index;
        renderLesson();
        // تمرير إلى القسم
        const section = document.querySelector(`.study-section[data-section="${index}"]`);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function nextSection() {
        if (currentSectionIndex < (currentLesson.sections?.length || 0) - 1) {
            // تسجيل القسم الحالي كمكتمل
            if (!progress.completedSections.includes(currentSectionIndex)) {
                progress.completedSections.push(currentSectionIndex);
            }
            goToSection(currentSectionIndex + 1);
        }
    }

    function prevSection() {
        if (currentSectionIndex > 0) {
            goToSection(currentSectionIndex - 1);
        }
    }

    // ===== أسئلة Knowledge Check =====
    function answerKnowledgeCheck(questionIndex, selectedIndex) {
        const section = currentLesson.sections[currentSectionIndex];
        const block = section.blocks[questionIndex];
        const feedback = document.getElementById(`kc-feedback-${questionIndex}`);
        
        if (!feedback) return;

        const isCorrect = selectedIndex === block.content.answer;
        const options = document.querySelectorAll(`.kc-option`);
        
        // قفل الخيارات
        options.forEach((opt, idx) => {
            opt.disabled = true;
            if (idx === block.content.answer) opt.classList.add('correct');
            if (idx === selectedIndex && !isCorrect) opt.classList.add('wrong');
        });

        // عرض التغذية الراجعة
        if (isCorrect) {
            feedback.innerHTML = `✅ ${block.content.feedback?.correct || 'أحسنت! إجابة صحيحة'}`;
            feedback.className = 'kc-feedback correct';
            progress.score += 10;
        } else {
            feedback.innerHTML = `❌ ${block.content.feedback?.incorrect || 'إجابة غير صحيحة. حاول مرة أخرى'}`;
            feedback.className = 'kc-feedback incorrect';
        }

        // تسجيل الإجابة
        const key = `${currentSectionIndex}-${questionIndex}`;
        progress.answeredQuestions[key] = selectedIndex;
        saveProgress();
    }

    // ===== الانتقال إلى الاختبار =====
    function goToQuiz() {
        if (!currentLesson.finalQuiz) {
            showToast('⚠️ لا يوجد اختبار نهائي لهذا الدرس');
            return;
        }

        // حفظ التقدم قبل الانتقال
        saveProgress();

        // الانتقال إلى صفحة الاختبار مع تمرير معرف الاختبار
        const quizUrl = `../Home/index.html?quizId=${currentLesson.finalQuiz.quizId}&grade=${currentLesson.grade}&subject=${currentLesson.subject}`;
        window.location.href = quizUrl;
    }

    // ===== التقدم والحفظ =====
    function calculateProgress() {
        const total = currentLesson.sections?.length || 1;
        const completed = progress.completedSections.length;
        return Math.round((completed / total) * 100);
    }

    function saveProgress() {
        try {
            const key = `study_${currentLesson.lessonId}`;
            localStorage.setItem(key, JSON.stringify({
                sectionIndex: currentSectionIndex,
                completedSections: progress.completedSections,
                answeredQuestions: progress.answeredQuestions,
                score: progress.score,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('Failed to save progress:', e);
        }
    }

    function restoreProgress() {
        try {
            const key = `study_${currentLesson.lessonId}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                const data = JSON.parse(saved);
                currentSectionIndex = data.sectionIndex || 0;
                progress.completedSections = data.completedSections || [];
                progress.answeredQuestions = data.answeredQuestions || {};
                progress.score = data.score || 0;
            }
        } catch (e) {
            console.warn('Failed to restore progress:', e);
        }
    }

    // ===== أدوات مساعدة =====
    function showToast(message) {
        // استخدام الـ Toast الموجود في النظام
        if (typeof showToast === 'function') {
            showToast(message);
        } else {
            alert(message);
        }
    }

    function showError(message) {
        const container = document.getElementById('lessonContainer');
        if (container) {
            container.innerHTML = `
                <div class="study-error">
                    <span style="font-size:3rem;">⚠️</span>
                    <h3>حدث خطأ</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">إعادة المحاولة</button>
                </div>
            `;
        }
    }

    // ===== واجهة عامة =====
    return {
        loadLesson,
        renderLesson,
        goToSection,
        nextSection,
        prevSection,
        answerKnowledgeCheck,
        goToQuiz,
        calculateProgress,
        saveProgress
    };
})();

// تصدير للاستخدام العام
window.StudyEngine = StudyEngine;
