let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const totalSlides = slides.length;
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
const dotsContainer = document.getElementById('nav-dots');

// Initialize dots
for (let i = 0; i < totalSlides; i++) {
  const dot = document.createElement('div');
  dot.classList.add('dot');
  if (i === 0) dot.classList.add('active');
  dot.addEventListener('click', () => goToSlide(i));
  dotsContainer.appendChild(dot);
}
const dots = document.querySelectorAll('.dot');

function updateUI() {
  // Update slides
  slides.forEach((slide, index) => {
    if (index === currentSlide) {
      slide.classList.add('active');
    } else {
      slide.classList.remove('active');
    }
  });

  // Update dots
  dots.forEach((dot, index) => {
    if (index === currentSlide) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  // Update buttons
  prevBtn.disabled = currentSlide === 0;
  nextBtn.disabled = currentSlide === totalSlides - 1;
}

window.nextSlide = function() {
  if (currentSlide < totalSlides - 1) {
    currentSlide++;
    updateUI();
  }
}

window.prevSlide = function() {
  if (currentSlide > 0) {
    currentSlide--;
    updateUI();
  }
}

window.goToSlide = function(index) {
  currentSlide = index;
  updateUI();
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
    window.nextSlide();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    window.prevSlide();
  }
});

// Mouse wheel navigation with debounce
let isScrolling = false;
document.addEventListener('wheel', (e) => {
  if (isScrolling) return;
  isScrolling = true;
  
  if (e.deltaY > 0) {
    window.nextSlide();
  } else if (e.deltaY < 0) {
    window.prevSlide();
  }
  
  setTimeout(() => {
    isScrolling = false;
  }, 800); // 800ms debounce matches the CSS transition time closely
});
