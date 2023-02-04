function openNav() {
    document.getElementById('side-bar').style.width = '200px';
    document.getElementById('main').style.marginLeft = '200px';
    document.getElementById('menu-buttons').style.display = 'flex';
    document.getElementById('open-menu').style.display = 'none';
    document.getElementById('close-menu').style.display = 'block';
}

function closeNav() {
    document.getElementById('side-bar').style.width = '75px';
    document.getElementById('main').style.marginLeft = '75px';
    document.getElementById('menu-buttons').style.display = 'none';
    document.getElementById('open-menu').style.display = 'block';
    document.getElementById('close-menu').style.display = 'none';
}

function confirmDelete() {
    document.getElementById('confirmation-window').style.display = 'flex';
    document.getElementById('report').style.filter = 'blur(5px)';     
}

function cancelDelete() {
    document.getElementById('confirmation-window').style.display = 'none';
    document.getElementById('report').style.filter = 'blur(0px)';     
}
