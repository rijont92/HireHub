   const showMenu = (toggleId, navId) =>{
    const toggle = document.getElementById(toggleId),
     nav = document.getElementById(navId)

    toggle.addEventListener('click', () =>{
    
    nav.classList.toggle('show-menu')

    // Add show-icon to show and hide the menu icon
    toggle.classList.toggle('show-icon')
})
}

    showMenu('nav-toggle','nav-menu');


  