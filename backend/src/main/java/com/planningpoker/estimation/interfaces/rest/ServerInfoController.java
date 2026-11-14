package com.planningpoker.estimation.interfaces.rest;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.Inet4Address;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Tells the UI which LAN addresses colleagues can use, so "copy invite link" works even when the
 * host opened the app as {@code localhost}.
 */
@RestController
class ServerInfoController {

    @GetMapping("/api/server-info")
    Map<String, Object> info(HttpServletRequest request) throws SocketException {
        int port = request.getLocalPort();
        List<String> urls = new ArrayList<>();
        for (NetworkInterface nic : Collections.list(NetworkInterface.getNetworkInterfaces())) {
            if (!nic.isUp() || nic.isLoopback() || nic.isVirtual() || nic.getName().startsWith("utun")) {
                continue;
            }
            Collections.list(nic.getInetAddresses()).stream()
                    .filter(address -> address instanceof Inet4Address && address.isSiteLocalAddress())
                    .map(address -> "http://" + address.getHostAddress() + ":" + port)
                    .forEach(urls::add);
        }
        return Map.of("lanUrls", urls);
    }
}
