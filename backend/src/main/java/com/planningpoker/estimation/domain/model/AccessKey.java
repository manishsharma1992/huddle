package com.planningpoker.estimation.domain.model;

import com.planningpoker.sharedkernel.domain.Guard;

import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.random.RandomGenerator;

/**
 * The secret a participant holds to prove "this seat is mine". It is never shown to other players,
 * so nobody can vote on someone else's behalf.
 */
public record AccessKey(String value) {
    public AccessKey {
        Guard.that(value != null && value.length() >= 32, "Access key is malformed");
    }

    public static AccessKey generate(RandomGenerator random) {
        byte[] bytes = new byte[24];
        for (int i = 0; i < bytes.length; i++) {
            bytes[i] = (byte) random.nextInt(256);
        }
        return new AccessKey(HexFormat.of().formatHex(bytes));
    }

    public boolean matches(String candidate) {
        if (candidate == null) {
            return false;
        }
        return MessageDigest.isEqual(value.getBytes(StandardCharsets.UTF_8), candidate.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public String toString() {
        return "AccessKey[****]";
    }
}
