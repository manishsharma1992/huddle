package com.planningpoker.estimation.interfaces.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/** Lets deep links like {@code /t/K7QF9M} load the React app, which then routes on the client. */
@Controller
class SinglePageAppController {

    @GetMapping({"/t/{code}", "/t/{code}/"})
    String table() {
        return "forward:/index.html";
    }
}
