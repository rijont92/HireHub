 
let tahiri = localStorage.getItem('tahiri') === "true";
const storedImage = localStorage.getItem('profileImage');

const removeItems = document.querySelectorAll(".remove"); 
const signUp = document.getElementById("sign__up");
const login = document.getElementById("login"); 
const profile_notification = document.querySelectorAll(".nonee");

import { isAuthenticated } from "./auth.js";


if(isAuthenticated() && window.location.pathname.endsWith("html/login.html")) {
  window.location.href = "index.html";
 
}

function logOut(event) {
    event.preventDefault();
    tahiri = false; 
    localStorage.setItem('tahiri', 'false');
    localStorage.setItem('profileImage', "img/useri.png")
    window.location.href = "html/login.html";
}


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
  