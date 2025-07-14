import { renderAuthenticationComponent } from "./authentication/AuthComponent.js";
import { renderMainPageComponent } from "./MainPage/MainpageComponent.js";
import { connectWebSocket } from "./websocket.js";

export function initializeApp() {
    const userToken = localStorage.getItem("userToken");

    if (!userToken) {
        loadAuthenticationPage();
    } else {
        // Connect to WebSocket server only for authenticated users
        connectWebSocket();
        loadMainPage()
    }
}

initializeApp();

function loadAuthenticationPage() {
    const app = document.querySelector(".app");
    app.innerHTML = renderAuthenticationComponent();
    loadCss("./authentication/AuthStyle.css");
    loadScript("./authentication/AuthScript.js");
}

export function loadMainPage() {
    const app = document.querySelector(".app");
    app.innerHTML = renderMainPageComponent();
    loadCss("./MainPage/MainpageStyle.css");
    loadScript("./MainPage/MainpageScript.js");
}

function loadCss(path) {
    const existingStyle = document.querySelector(".dynamicstyles");
    if (existingStyle) {
        document.head.removeChild(existingStyle);
    }

    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("type", "text/css");
    link.setAttribute("href", path);
    link.setAttribute("class", "dynamicstyles");
    document.head.appendChild(link);
}

function loadScript(path) {
    const existingScript = document.querySelector(".dynamicScript");
    if (existingScript) {
        document.head.removeChild(existingScript);
    }
    const script = document.createElement("script");
    script.setAttribute("src", path);
    script.setAttribute("type", "module");
    script.setAttribute("class", "dynamicScript");
    script.defer = true;
    document.head.appendChild(script);
}
