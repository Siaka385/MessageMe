import { Authentication } from "./authentication/AuthComponent.js";
import { MainPageComponet } from "./MainPage/MainpageComponent.js";

function initialize() {
    var userToken = localStorage.getItem("userToken");
    var app = document.querySelector(".app");

    if (!userToken) {
        app.innerHTML = Authentication();
        InitializeCss("./authentication/AuthStyle.css");
        initializeScript("./authentication/AuthScript.js");
    } else {
        app.innerHTML = MainPageComponet();
        InitializeCss("./MainPage/MainpageStyle.css");
        initializeScript("./MainPage/MainpageScript.js");
    }
}

initialize();


function InitializeCss(path) {
    let currentStyle = document.querySelector(".dynamicstyles");
    if (currentStyle) {
        document.head.removeChild(currentStyle);
    }

    let css = document.createElement("link");
    css.setAttribute("rel", "stylesheet");
    css.setAttribute("type", "text/css");
    css.setAttribute("href", `${path}`);
    css.setAttribute("class", "dynamicstyles");
    document.head.appendChild(css);
}

function initializeScript(path) {
    let currentScript = document.querySelector(".dynamicScript");
    if (currentScript) {
        document.head.removeChild(currentScript);
    }

    let script = document.createElement("script");
    script.setAttribute("src", `${path}`);
    script.setAttribute("type", "text/javascript");
    script.setAttribute("class", "dynamicScript");
    script.defer = true;
    document.head.appendChild(script);
}

