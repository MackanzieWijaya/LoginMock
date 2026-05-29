// --- Configuration ---
// Change this to match your local backend server port
const API_BASE_URL = '/api'; 

// --- Login Page Logic ---
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const authType = document.getElementById('authType').value;
        const errorMsg = document.getElementById('errorMessage');

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, authType }),
                // Important for cookie testing: ensures cookies are sent/received
                credentials: 'include' 
            });

            if (response.ok) {
                const data = await response.json();
                
                // If testing JWT, we purposefully store it in localStorage 
                // to demonstrate potential XSS vulnerabilities in your paper.
                if (authType === 'jwt' && data.token) {
                    localStorage.setItem('jwt_token', data.token);
                }
                
                // Redirect to the landing page
                window.location.href = 'dashboard.html';
            } else {
                errorMsg.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login Error:', error);
            errorMsg.classList.remove('hidden');
            errorMsg.innerText = "Network error. Is the backend running?";
        }
    });
}

// --- Dashboard Page Logic ---
const testSessionBtn = document.getElementById('testSessionBtn');
const logoutBtn = document.getElementById('logoutBtn');
const sessionResult = document.getElementById('sessionResult');

if (testSessionBtn) {
    testSessionBtn.addEventListener('click', async () => {

        sessionResult.innerText = "Pinging server...";
        sessionResult.style.color = "black";

        const token = localStorage.getItem('jwt_token');
        const headers = {
            'Content-Type':'application/json'
        };

        if(token){
            headers['Authorization'] =
                `Bearer ${token}`;
        }

        try{

            const response = await fetch(
                `${API_BASE_URL}/protected-route`,
                {
                    method:'GET',
                    headers:headers,
                    credentials:'include'
                }
            );

            console.log(
                "Status:",
                response.status
            );

            if(response.ok){

                const data =
                    await response.json();

                console.log(data);

                sessionResult.innerText =
                    `✅ Success! Server says: ${data.message}`;

                sessionResult.style.color =
                    "green";

            }else{

                sessionResult.innerText =
                    `❌ Access Denied (${response.status})`;

                sessionResult.style.color =
                    "red";
            }

        }catch(error){

            console.log(error);

            sessionResult.innerText =
                "❌ Network Error";

            sessionResult.style.color =
                "red";
        }

    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {

        try {

            await fetch('/api/logout', {
                method:'POST',
                credentials:'include'
            });

        } catch(err){
            console.log(err);
        }

        localStorage.removeItem('jwt_token');

        window.location.href='index.html';

    });
}

const postCommentBtn = document.getElementById("postCommentBtn");
const commentsDiv = document.getElementById("comments");

async function loadComments() {
    if (!commentsDiv) return;

    const response = await fetch("/api/comments");
    const comments = await response.json();

    commentsDiv.innerHTML = "";

    comments.forEach(c => {
        commentsDiv.innerHTML += `
            <p><strong>${c.username}:</strong> ${c.comment}</p>
        `;
    });
}

if (postCommentBtn) {
    postCommentBtn.addEventListener("click", async () => {
        const comment = document.getElementById("commentInput").value;

        const token = localStorage.getItem("jwt_token");

        const headers = {
            "Content-Type": "application/json"
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        await fetch("/api/comments", {
            method: "POST",
            headers: headers,
            credentials: "include",
            body: JSON.stringify({ comment })
        });

        document.getElementById("commentInput").value = "";

        loadComments();
    });

    loadComments();
}

const clearCommentsBtn =
    document.getElementById("clearCommentsBtn");

if(clearCommentsBtn){

    clearCommentsBtn.addEventListener(
        "click",
        async ()=>{

            await fetch("/api/comments",{
                method:"DELETE"
            });

            loadComments();

        }
    );

}