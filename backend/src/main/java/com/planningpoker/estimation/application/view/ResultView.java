package com.planningpoker.estimation.application.view;

import java.util.List;
import java.util.Map;

public record ResultView(int voteCount, Map<String, Integer> distribution, Double average, Double median,
                         boolean consensus, int agreementPercent, String suggestedEstimate,
                         List<String> outliers, String fastestVoterId, Long fastestVoteMillis) {
}
