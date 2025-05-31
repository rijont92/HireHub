import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Scroll animation for featured bars
document.addEventListener('scroll', function () {
    const boxes = document.querySelectorAll('.featured-bar-color');
    const windowHeight = window.innerHeight;
    const container = document.getElementById("featured-container");
  
    boxes.forEach((box) => {
      const rect = container.getBoundingClientRect();
      const boxTop = rect.top;
  
      if (boxTop < windowHeight - 200 && !box.classList.contains('animated')) {
        box.classList.add('animated'); 
        let i = 0;
  
        function updateBar() {
          i++;
          box.style.width = i + '%';
  
          if (i >= box.getAttribute('data-value')) {
            clearInterval(interval);
          }
        }
  
        const interval = setInterval(updateBar, 1);
      }
    });
});

// Scroll animation for work rows
document.addEventListener('scroll', function() {
    const boxes = document.querySelectorAll('.work-row');
    const windowHeight = window.innerHeight;
  
    boxes.forEach(box => {
        const rect = box.getBoundingClientRect();
        const boxTop = rect.top;
  
        if (boxTop < windowHeight - 200) {
            box.classList.add('reveal');
        } else {
            box.classList.remove('reveal');
        }
    });
});

