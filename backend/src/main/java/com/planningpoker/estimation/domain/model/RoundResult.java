package com.planningpoker.estimation.domain.model;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * What the face-up cards tell the team. Pure value object: derived entirely from the deck and the votes.
 *
 * @param distribution        how many of each card were played, in deck order
 * @param average             mean of the numeric cards, if any
 * @param median              median of the numeric cards, if any
 * @param consensus           everybody (at least two people) played the same estimate
 * @param agreementPercent    share of votes on the most popular estimate
 * @param suggestedEstimate   the card the team seems to lean towards
 * @param outliers            voters far from the crowd: they likely know something worth hearing
 * @param fastestVoter        who played first
 * @param fastestVoteAfter    how long the fastest voter took
 */
public record RoundResult(
        int voteCount,
        Map<String, Integer> distribution,
        Double average,
        Double median,
        boolean consensus,
        int agreementPercent,
        Card suggestedEstimate,
        List<ParticipantId> outliers,
        ParticipantId fastestVoter,
        Duration fastestVoteAfter) {

    private static final int OUTLIER_DISTANCE = 2;

    public static RoundResult of(Deck deck, Collection<Vote> votes, Instant roundStartedAt) {
        Map<String, Integer> distribution = new LinkedHashMap<>();
        for (Card card : deck.cards()) {
            int count = (int) votes.stream().filter(vote -> vote.card().equals(card)).count();
            if (count > 0) {
                distribution.put(card.label(), count);
            }
        }

        List<Vote> numericVotes = votes.stream().filter(vote -> vote.card().isNumeric()).toList();
        List<Double> values = numericVotes.stream().map(vote -> vote.card().numericValue()).sorted().toList();
        Double average = values.isEmpty() ? null : values.stream().mapToDouble(Double::doubleValue).average().orElseThrow();
        Double median = median(values);

        boolean consensus = votes.size() >= 2
                && votes.stream().allMatch(vote -> vote.card().isEstimate())
                && votes.stream().map(Vote::card).distinct().count() == 1;

        Card popular = votes.stream()
                .map(Vote::card)
                .filter(Card::isEstimate)
                .distinct()
                .max(Comparator.<Card>comparingLong(card -> votes.stream().filter(v -> v.card().equals(card)).count())
                        .thenComparingInt(deck::positionOf))
                .orElse(null);
        int agreement = popular == null || votes.isEmpty() ? 0
                : (int) Math.round(100.0 * votes.stream().filter(v -> v.card().equals(popular)).count() / votes.size());

        List<ParticipantId> outliers = new ArrayList<>();
        if (!consensus && numericVotes.size() >= 3) {
            List<Integer> positions = numericVotes.stream().map(vote -> deck.positionOf(vote.card())).sorted().toList();
            double medianPosition = median(positions.stream().map(Integer::doubleValue).toList());
            numericVotes.stream()
                    .filter(vote -> Math.abs(deck.positionOf(vote.card()) - medianPosition) >= OUTLIER_DISTANCE)
                    .map(Vote::voter)
                    .forEach(outliers::add);
        }

        Vote fastest = votes.stream().min(Comparator.comparing(Vote::castAt)).orElse(null);
        Duration fastestAfter = fastest == null || roundStartedAt == null ? null
                : Duration.between(roundStartedAt, fastest.castAt()).abs();

        return new RoundResult(votes.size(), distribution, average, median, consensus, agreement, popular,
                List.copyOf(outliers), fastest == null ? null : fastest.voter(), fastestAfter);
    }

    private static Double median(List<Double> sorted) {
        if (sorted.isEmpty()) {
            return null;
        }
        int middle = sorted.size() / 2;
        return sorted.size() % 2 == 1 ? sorted.get(middle) : (sorted.get(middle - 1) + sorted.get(middle)) / 2;
    }
}
