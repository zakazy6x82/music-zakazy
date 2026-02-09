class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audioPlayer');
        this.playBtn = document.getElementById('playBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.progress = document.getElementById('progress');
        this.volume = document.getElementById('volume');
        this.currentTimeEl = document.getElementById('currentTime');
        this.durationEl = document.getElementById('duration');
        this.currentTitle = document.getElementById('currentTitle');
        this.currentArtist = document.getElementById('currentArtist');
        this.currentCover = document.getElementById('currentCover');
        this.favoriteBtn = document.getElementById('favoriteBtn');
        
        this.tracks = [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        
        this.init();
        this.loadTracks();
    }
    
    init() {
        // Обработчики кнопок
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.prevBtn.addEventListener('click', () => this.prevTrack());
        this.nextBtn.addEventListener('click', () => this.nextTrack());
        this.favoriteBtn.addEventListener('click', () => this.toggleFavorite());
        
        // Прогресс трека
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.progress.addEventListener('input', (e) => this.seek(e.target.value));
        
        // Громкость
        this.volume.addEventListener('input', (e) => {
            this.audio.volume = e.target.value / 100;
        });
        
        // Автопереключение на следующий трек
        this.audio.addEventListener('ended', () => this.nextTrack());
        
        // Поиск
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterTracks(e.target.value);
        });
        
        // Загрузка файлов
        this.setupFileUpload();
        
        // Service Worker для фонового режима (если поддерживается)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(console.error);
        }
    }
    
    async loadTracks() {
        try {
            const response = await fetch('/api/tracks');
            this.tracks = await response.json();
            this.renderTracks();
        } catch (error) {
            console.error('Ошибка загрузки треков:', error);
            this.showNotification('Ошибка загрузки треков', 'error');
        }
    }
    
    renderTracks(filter = '') {
        const container = document.getElementById('tracksList');
        const filteredTracks = this.tracks.filter(track => 
            track.title.toLowerCase().includes(filter.toLowerCase()) ||
            track.artist.toLowerCase().includes(filter.toLowerCase())
        );
        
        container.innerHTML = filteredTracks.map((track, index) => `
            <div class="track-card ${index === this.currentTrackIndex && this.isPlaying ? 'playing' : ''}" 
                 data-index="${index}">
                <img src="${track.cover || 'https://via.placeholder.com/200'}" 
                     alt="Обложка" class="track-cover">
                <div class="track-title">${track.title}</div>
                <div class="track-artist">${track.artist}</div>
                <div class="track-controls">
                    <button class="play-track" data-index="${index}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="favorite-track ${this.favorites.includes(track.id) ? 'active' : ''}" 
                            data-id="${track.id}">
                        <i class="${this.favorites.includes(track.id) ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Добавляем обработчики для кнопок треков
        document.querySelectorAll('.play-track').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.target.closest('button').dataset.index);
                this.playTrack(index);
            });
        });
        
        document.querySelectorAll('.favorite-track').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.target.closest('button').dataset.id;
                this.toggleFavoriteById(id);
            });
        });
        
        document.querySelectorAll('.track-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    const index = parseInt(card.dataset.index);
                    this.playTrack(index);
                }
            });
        });
    }
    
    playTrack(index) {
        this.currentTrackIndex = index;
        const track = this.tracks[index];
        
        this.audio.src = `/uploads/${track.file}`;
        this.currentTitle.textContent = track.title;
        this.currentArtist.textContent = track.artist;
        this.currentCover.src = track.cover || 'https://via.placeholder.com/60';
        
        // Обновляем состояние кнопки избранного
        this.updateFavoriteButton(track.id);
        
        this.play();
    }
    
    play() {
        this.audio.play();
        this.isPlaying = true;
        this.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        this.updateActiveTrackCard();
    }
    
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.playBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
    
    togglePlay() {
        if (this.audio.src) {
            if (this.isPlaying) {
                this.pause();
            } else {
                this.play();
            }
        } else if (this.tracks.length > 0) {
            this.playTrack(0);
        }
    }
    
    prevTrack() {
        this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
        this.playTrack(this.currentTrackIndex);
    }
    
    nextTrack() {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        this.playTrack(this.currentTrackIndex);
    }
    
    updateProgress() {
        const current = this.audio.currentTime;
        const duration = this.audio.duration || 0;
        
        this.progress.value = duration ? (current / duration) * 100 : 0;
        this.currentTimeEl.textContent = this.formatTime(current);
        this.durationEl.textContent = this.formatTime(duration);
    }
    
    seek(value) {
        const duration = this.audio.duration || 0;
        this.audio.currentTime = (value / 100) * duration;
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    toggleFavorite() {
        const track = this.tracks[this.currentTrackIndex];
        if (!track) return;
        
        const index = this.favorites.indexOf(track.id);
        if (index === -1) {
            this.favorites.push(track.id);
            this.favoriteBtn.classList.add('active');
            this.favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
            this.showNotification('Добавлено в избранное');
        } else {
            this.favorites.splice(index, 1);
            this.favoriteBtn.classList.remove('active');
            this.favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
            this.showNotification('Удалено из избранного');
        }
        
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        this.renderTracks(); // Обновляем список
    }
    
    toggleFavoriteById(id) {
        const index = this.favorites.indexOf(id);
        if (index === -1) {
            this.favorites.push(id);
        } else {
            this.favorites.splice(index, 1);
        }
        
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        this.updateFavoriteButton(id);
        this.renderTracks(); // Обновляем список
    }
    
    updateFavoriteButton(trackId) {
        if (trackId === this.tracks[this.currentTrackIndex]?.id) {
            const isFavorite = this.favorites.includes(trackId);
            this.favoriteBtn.classList.toggle('active', isFavorite);
            this.favoriteBtn.innerHTML = isFavorite 
                ? '<i class="fas fa-heart"></i>' 
                : '<i class="far fa-heart"></i>';
        }
    }
    
    updateActiveTrackCard() {
        document.querySelectorAll('.track-card').forEach(card => {
            card.classList.remove('playing');
        });
        
        const activeCard = document.querySelector(`.track-card[data-index="${this.currentTrackIndex}"]`);
        if (activeCard) {
            activeCard.classList.add('playing');
        }
    }
    
    filterTracks(query) {
        this.renderTracks(query);
    }
    
    setupFileUpload() {
        const dropArea = document.getElementById('dropArea');
        const fileInput = document.getElementById('fileInput');
        const uploadBtn = document.getElementById('uploadBtn');
        const uploadSection = document.getElementById('uploadSection');
        
        // Показать/скрыть секцию загрузки
        uploadBtn.addEventListener('click', () => {
            uploadSection.style.display = 
                uploadSection.style.display === 'none' ? 'block' : 'none';
        });
        
        // Drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            dropArea.classList.add('dragover');
        }
        
        function unhighlight() {
            dropArea.classList.remove('dragover');
        }
        
        dropArea.addEventListener('drop', handleDrop, false);
        fileInput.addEventListener('change', handleFiles, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles({ target: { files } });
        }
        
        const handleFiles = async (e) => {
            const files = Array.from(e.target.files);
            
            for (const file of files) {
                if (!file.type.startsWith('audio/')) {
                    this.showNotification(`Файл ${file.name} не является аудио`, 'error');
                    continue;
                }
                
                await this.uploadFile(file);
            }
        }.bind(this);
    }
    
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('audio', file);
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`Трек "${file.name}" загружен`);
                this.loadTracks(); // Обновляем список треков
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            this.showNotification(`Ошибка загрузки: ${error.message}`, 'error');
        }
    }
    
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.style.background = type === 'error' ? '#ff4444' : '#ff2e63';
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.musicPlayer = new MusicPlayer();
    
    // Установка заголовка вкладки при воспроизведении
    const audio = document.getElementById('audioPlayer');
    audio.addEventListener('play', () => {
        const track = window.musicPlayer.tracks[window.musicPlayer.currentTrackIndex];
        if (track) {
            document.title = `${track.title} - ${track.artist} | Музыкальный плеер`;
        }
    });
    
    audio.addEventListener('pause', () => {
        document.title = 'Музыкальный плеер';
    });
});