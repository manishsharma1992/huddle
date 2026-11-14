package com.planningpoker.estimation.application.view;

import java.util.List;

public record StoryView(String id, String title, String status, int round, Long roundStartedAt,
                        List<VoteView> votes, String finalEstimate, boolean unanimous, ResultView result) {
}
