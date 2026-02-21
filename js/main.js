// ========================================
// 水杯模擬器主程序 - Web App 版本
// ========================================

class WaterGlassSimulator {
    constructor() {
        // DOM 元素
        this.startScreen = document.getElementById('startScreen');
        this.app = document.getElementById('app');
        this.loading = document.getElementById('loading');
        this.water = document.getElementById('water');
        this.glassContainer = document.getElementById('glassContainer');
        this.splash = document.getElementById('splash');
        this.hint = document.getElementById('hint');
        this.messageEl = document.getElementById('message');
        
        // 狀態顯示
        this.waterLevelDisplay = document.getElementById('waterLevel');
        this.tiltAngleDisplay = document.getElementById('tiltAngle');
        this.drankAmountDisplay = document.getElementById('drankAmount');
        
        // 按鈕
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.toggleSoundBtn = document.getElementById('toggleSound');
        
        // 狀態變量
        this.waterLevel = 100; // 水位百分比
        this.maxWater = 500; // 最大容量 (ml)
        this.drankAmount = 0; // 已喝水量
        this.tiltAngle = 0; // 傾斜角度
        this.isDrinking = false; // 是否正在喝水
        this.soundEnabled = true; // 音效開關
        
        // 感應器數據
        this.beta = 0; // 前後傾斜
        this.gamma = 0; // 左右傾斜
        this.lastDrinkTime = 0; // 上次喝水時間
        
        // 音效系統
        this.audioContext = null;
        this.drinkingOscillator = null;
        this.drinkingGain = null;
        
        // 初始化
        this.init();
    }
    
    init() {
        // 綁定事件
        this.startBtn.addEventListener('click', () => this.start());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.toggleSoundBtn.addEventListener('click', () => this.toggleSound());
        
        // 初始化音效系統
        this.initSounds();
        
        // 創建氣泡
        this.createBubbles();
        
        // 隱藏提示（3秒後）
        setTimeout(() => {
            if (this.hint) {
                this.hint.style.transition = 'opacity 0.5s';
                this.hint.style.opacity = '0';
                setTimeout(() => {
                    this.hint.style.display = 'none';
                }, 500);
            }
        }, 3000);
    }
    
    async start() {
        this.loading.style.display = 'flex';
        
        try {
            // 請求感應器權限（iOS 13+）
            if (typeof DeviceMotionEvent !== 'undefined' && 
                typeof DeviceMotionEvent.requestPermission === 'function') {
                const permission = await DeviceMotionEvent.requestPermission();
                if (permission !== 'granted') {
                    alert('需要動作感應器權限才能使用此功能！');
                    this.loading.style.display = 'none';
                    return;
                }
            }
            
            // 啟動感應器
            this.startSensors();
            
            // 切換畫面
            this.startScreen.style.animation = 'fadeOut 0.5s ease';
            setTimeout(() => {
                this.startScreen.style.display = 'none';
                this.app.style.display = 'block';
                this.loading.style.display = 'none';
            }, 500);
            
        } catch (error) {
            console.error('啟動失敗:', error);
            alert('無法啟動感應器，請確認設備支援此功能。\n\n提示：請使用實體 iPhone 或 Android 手機測試。');
            this.loading.style.display = 'none';
        }
    }
    
    startSensors() {
        // 監聽裝置方向變化
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (event) => {
                this.handleOrientation(event);
            }, true);
        } else {
            this.showMessage('你的設備不支援動作感應器');
        }
        
        // 監聽裝置動作
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', (event) => {
                this.handleMotion(event);
            }, true);
        }
        
        // 開始更新循環
        this.startUpdateLoop();
    }
    
    handleOrientation(event) {
        // beta: 前後傾斜 (-180 到 180)
        // gamma: 左右傾斜 (-90 到 90)
        this.beta = event.beta || 0;
        this.gamma = event.gamma || 0;
        
        // 計算傾斜角度（用於顯示）
        this.tiltAngle = Math.round(this.beta);
        this.tiltAngleDisplay.textContent = `${this.tiltAngle}°`;
        
        // 檢查是否在喝水姿勢（手機向後傾斜）
        const drinkingThreshold = -30;
        const wasDrinking = this.isDrinking;
        this.isDrinking = this.beta < drinkingThreshold && this.waterLevel > 0;
        
        // 開始喝水
        if (this.isDrinking && !wasDrinking) {
            this.startDrinking();
        }
        
        // 停止喝水
        if (!this.isDrinking && wasDrinking) {
            this.stopDrinking();
        }
        
        // 更新水面傾斜效果
        this.updateWaterTilt();
    }
    
    handleMotion(event) {
        // 可以用來檢測晃動等動作
        const acceleration = event.accelerationIncludingGravity;
        if (acceleration) {
            // 這裡可以添加更多基於加速度的效果
        }
    }
    
    updateWaterTilt() {
        // 根據傾斜角度調整水面
        const maxTilt = 15; // 最大傾斜角度
        let tiltDegree = 0;
        
        if (this.beta < -30) {
            // 向後傾斜時，水面向杯口傾斜
            tiltDegree = Math.min((Math.abs(this.beta) - 30) / 3, maxTilt);
        }
        
        // 應用傾斜效果
        this.water.style.transform = `rotate(${tiltDegree}deg)`;
        this.glassContainer.style.transform = `rotate(${this.gamma * 0.1}deg)`;
    }
    
    startDrinking() {
        console.log('開始喝水');
        this.lastDrinkTime = Date.now();
        
        // 播放喝水音效
        if (this.soundEnabled) {
            this.playDrinkingSound();
        }
    }
    
    stopDrinking() {
        console.log('停止喝水');
        
        // 停止音效
        this.stopDrinkingSound();
    }
    
    startUpdateLoop() {
        const update = () => {
            // 如果正在喝水，減少水量
            if (this.isDrinking && this.waterLevel > 0) {
                const now = Date.now();
                const deltaTime = (now - this.lastDrinkTime) / 1000; // 秒
                this.lastDrinkTime = now;
                
                // 根據傾斜角度調整喝水速度
                const drinkSpeed = Math.min((Math.abs(this.beta) - 30) / 10, 5);
                const decrease = drinkSpeed * deltaTime;
                
                this.waterLevel = Math.max(0, this.waterLevel - decrease);
                
                // 更新已喝水量
                this.drankAmount = Math.round((100 - this.waterLevel) / 100 * this.maxWater);
                
                // 創建水花效果
                if (Math.random() < 0.3) {
                    this.createSplash();
                }
                
                // 水喝完時的效果
                if (this.waterLevel === 0 && this.isDrinking) {
                    this.onWaterEmpty();
                }
            }
            
            // 更新顯示
            this.updateDisplay();
            
            // 繼續循環
            requestAnimationFrame(update);
        };
        
        update();
    }
    
    updateDisplay() {
        // 更新水位
        this.water.style.height = `${this.waterLevel}%`;
        this.waterLevelDisplay.textContent = `${Math.round(this.waterLevel)}%`;
        
        // 更新已喝水量
        this.drankAmountDisplay.textContent = `${this.drankAmount}ml`;
        
        // 水位顏色變化（根據剩餘量）
        if (this.waterLevel < 20) {
            this.water.style.background = 'linear-gradient(to bottom, rgba(255, 100, 100, 0.85) 0%, rgba(255, 50, 50, 0.9) 100%)';
        } else if (this.waterLevel < 50) {
            this.water.style.background = 'linear-gradient(to bottom, rgba(100, 180, 255, 0.85) 0%, rgba(50, 150, 255, 0.9) 100%)';
        } else {
            this.water.style.background = 'linear-gradient(to bottom, rgba(64, 156, 255, 0.9) 0%, rgba(0, 119, 255, 0.95) 100%)';
        }
    }
    
    createSplash() {
        const splashCount = 5 + Math.floor(Math.random() * 5); // 增加水花數量
        
        for (let i = 0; i < splashCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'splash-particle';
            
            // 隨機大小（藝術化變化）
            const size = 8 + Math.random() * 12;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            // 隨機位置（從杯口噴出，更廣範圍）
            const startX = 20 + Math.random() * 60; // 20-80%
            const startY = -5 + Math.random() * 10; // 從杯口上方開始
            
            particle.style.left = `${startX}%`;
            particle.style.top = `${startY}%`;
            
            // 隨機顏色變化（藍色系漸變）
            const hue = 200 + Math.random() * 20; // 200-220 (藍色)
            const saturation = 80 + Math.random() * 20; // 80-100%
            const lightness = 60 + Math.random() * 20; // 60-80%
            particle.style.background = `radial-gradient(circle, 
                hsla(${hue}, ${saturation}%, ${lightness + 20}%, 0.95) 0%, 
                hsla(${hue}, ${saturation}%, ${lightness}%, 0.8) 100%)`;
            
            this.splash.appendChild(particle);
            
            // 藝術化動畫（帶旋轉和曲線軌跡）
            const angle = Math.random() * Math.PI * 0.6 - Math.PI * 0.3; // 更大的角度範圍
            const speed = 80 + Math.random() * 120;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 60;
            const gravity = 220;
            const rotation = Math.random() * 360; // 初始旋轉角度
            const rotationSpeed = (Math.random() - 0.5) * 720; // 旋轉速度
            
            let x = startX;
            let y = startY;
            let velocityX = vx;
            let velocityY = vy;
            let opacity = 1;
            let currentRotation = rotation;
            let startTime = Date.now();
            let scale = 1;
            
            const animate = () => {
                const now = Date.now();
                const dt = (now - startTime) / 1000;
                startTime = now;
                
                velocityY += gravity * dt;
                x += velocityX * dt * 0.1;
                y += velocityY * dt * 0.1;
                opacity -= dt * 1.8; // 更慢的淡出
                currentRotation += rotationSpeed * dt; // 旋轉
                scale += dt * 0.3; // 逐漸變大
                
                particle.style.left = `${x}%`;
                particle.style.top = `${y}%`;
                particle.style.opacity = opacity;
                particle.style.transform = `rotate(${currentRotation}deg) scale(${scale})`;
                
                if (opacity > 0 && y < 100) {
                    requestAnimationFrame(animate);
                } else {
                    particle.remove();
                }
            };
            
            animate();
        }
    }
    
    createBubbles() {
        const bubblesContainer = document.getElementById('bubbles');
        const bubbleCount = 20;
        
        for (let i = 0; i < bubbleCount; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            
            const size = 3 + Math.random() * 8;
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            bubble.style.left = `${Math.random() * 100}%`;
            bubble.style.bottom = `${Math.random() * 20}%`;
            
            const duration = 3 + Math.random() * 5;
            const delay = Math.random() * 3;
            bubble.style.animationDuration = `${duration}s`;
            bubble.style.animationDelay = `${delay}s`;
            
            bubblesContainer.appendChild(bubble);
        }
    }
    
    onWaterEmpty() {
        console.log('水喝完了！');
        this.isDrinking = false;
        
        if (this.soundEnabled) {
            this.playEmptySound();
        }
        
        this.showMessage('水喝完了！🎉');
    }
    
    showMessage(text) {
        this.messageEl.textContent = text;
        this.messageEl.style.display = 'block';
        
        setTimeout(() => {
            this.messageEl.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                this.messageEl.style.display = 'none';
                this.messageEl.style.animation = 'messageSlide 0.3s ease';
            }, 300);
        }, 2000);
    }
    
    reset() {
        this.waterLevel = 100;
        this.drankAmount = 0;
        this.updateDisplay();
        
        if (this.soundEnabled) {
            this.playPourSound();
        }
        
        this.showMessage('水杯已裝滿！💧');
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const icon = this.toggleSoundBtn.querySelector('.btn-icon');
        icon.textContent = this.soundEnabled ? '🔊' : '🔇';
        
        if (!this.soundEnabled) {
            this.stopDrinkingSound();
        }
    }
    
    // ========================================
    // 音效系統（使用 Web Audio API）
    // ========================================
    
    initSounds() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API 不支援');
        }
    }
    
    playDrinkingSound() {
        if (!this.audioContext) return;
        if (this.drinkingOscillator) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        
        this.drinkingOscillator = oscillator;
        this.drinkingGain = gainNode;
        
        // 添加波動效果
        const modulator = this.audioContext.createOscillator();
        modulator.frequency.value = 5;
        const modulatorGain = this.audioContext.createGain();
        modulatorGain.gain.value = 20;
        
        modulator.connect(modulatorGain);
        modulatorGain.connect(oscillator.frequency);
        modulator.start();
        
        this.drinkingModulator = modulator;
    }
    
    stopDrinkingSound() {
        if (this.drinkingOscillator && this.audioContext) {
            try {
                this.drinkingGain.gain.exponentialRampToValueAtTime(
                    0.01, 
                    this.audioContext.currentTime + 0.3
                );
                this.drinkingOscillator.stop(this.audioContext.currentTime + 0.3);
                if (this.drinkingModulator) {
                    this.drinkingModulator.stop(this.audioContext.currentTime + 0.3);
                }
            } catch (e) {
                console.log('停止音效時發生錯誤');
            }
            this.drinkingOscillator = null;
            this.drinkingModulator = null;
        }
    }
    
    playPourSound() {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
            150, 
            this.audioContext.currentTime + 0.5
        );
        
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01, 
            this.audioContext.currentTime + 0.5
        );
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }
    
    playEmptySound() {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01, 
            this.audioContext.currentTime + 0.3
        );
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }
}

// ========================================
// 啟動應用
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    const simulator = new WaterGlassSimulator();
    
    // 防止頁面滾動
    document.body.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });
});
