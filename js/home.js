 
let tahiri = localStorage.getItem('tahiri') === "true";
const storedImage = localStorage.getItem('profileImage');

const removeItems = document.querySelectorAll(".remove"); 
const signUp = document.getElementById("sign__up");
const login = document.getElementById("login"); 
const profile_notification = document.querySelectorAll(".nonee");


function updateUI() {



    if (tahiri) {

      
    if (storedImage) {
      document.getElementById('img-profile').src = storedImage;
      document.getElementById('img-profile2').src = storedImage;
    }else {
      document.getElementById('img-profile').src = "../img/useri.png";
      document.getElementById('img-profile2').src = "../img/useri.png";
    }
     
        removeItems.forEach(item => {
            item.style.display = "initial !important"; 
        });
        signUp.style.display = "none"; 
        profile_notification.forEach(item => {
          item.style.display = "initial";
        })
        login.innerHTML = '<i class="ri-logout-box-line"></i> Log Out'; 
        login.href = "html/login.html"; 
        login.onclick = logOut; 
    } else {
        // User is logged out
        removeItems.forEach(item => {
            item.style.display = "none"; 
        });
        signUp.style.display = "block"; 
        login.innerHTML = '<i class="ri-login-box-line"></i> Log In'; 
        login.href = "html/login.html"; 
        login.onclick = null; 
    }
}


function logOut(event) {
    event.preventDefault();
    tahiri = false; 
    localStorage.setItem('tahiri', 'false');
    localStorage.setItem('profileImage', "img/useri.png")
    window.location.href = "html/login.html";
    updateUI();
}

updateUI();

document.addEventListener('scroll', function () {
    const boxes = document.querySelectorAll('.featured-bar-color');
    const windowHeight = window.innerHeight;
    const container = document.getElementById("featured-container");
  
    boxes.forEach((box) => {
      const rect = container.getBoundingClientRect();
      const boxTop = rect.top;
  
      // Check if the bar is in the viewport
      if (boxTop < windowHeight - 200 && !box.classList.contains('animated')) {
        box.classList.add('animated'); // Mark the bar as animated
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
  