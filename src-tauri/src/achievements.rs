use crate::models::{Achievement, DailySummary, PetState, UserProgress};
use std::collections::HashMap;

/// Time cutoffs for time-based achievements
const EARLY_BIRD_HOUR_CUTOFF: u32 = 8;
const NIGHT_OWL_HOUR_START: u32 = 22;

/// Initialize all achievements with default locked state
pub fn initialize_achievements() -> Vec<Achievement> {
    vec![
        // Focus Achievements
        Achievement {
            id: "first_session".to_string(),
            category: "focus".to_string(),
            title: "First Steps".to_string(),
            description: "Complete your first focus session".to_string(),
            icon: "🎯".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 1,
            hidden: false,
        },
        Achievement {
            id: "focused_5".to_string(),
            category: "focus".to_string(),
            title: "Getting Started".to_string(),
            description: "Complete 5 focus sessions".to_string(),
            icon: "🔥".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 5,
            hidden: false,
        },
        Achievement {
            id: "focused_25".to_string(),
            category: "focus".to_string(),
            title: "Focused Mind".to_string(),
            description: "Complete 25 focus sessions".to_string(),
            icon: "💪".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 25,
            hidden: false,
        },
        Achievement {
            id: "focused_100".to_string(),
            category: "focus".to_string(),
            title: "Centurion".to_string(),
            description: "Complete 100 focus sessions".to_string(),
            icon: "👑".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 100,
            hidden: false,
        },
        Achievement {
            id: "marathon".to_string(),
            category: "focus".to_string(),
            title: "Marathon".to_string(),
            description: "Complete 10 sessions in one day".to_string(),
            icon: "🏃".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 10,
            hidden: false,
        },
        // Streak Achievements
        Achievement {
            id: "streak_3".to_string(),
            category: "streak".to_string(),
            title: "Consistency".to_string(),
            description: "Maintain a 3-day streak".to_string(),
            icon: "📅".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 3,
            hidden: false,
        },
        Achievement {
            id: "streak_7".to_string(),
            category: "streak".to_string(),
            title: "Week Warrior".to_string(),
            description: "Maintain a 7-day streak".to_string(),
            icon: "🌟".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 7,
            hidden: false,
        },
        Achievement {
            id: "streak_30".to_string(),
            category: "streak".to_string(),
            title: "Monthly Master".to_string(),
            description: "Maintain a 30-day streak".to_string(),
            icon: "🎖️".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 30,
            hidden: false,
        },
        Achievement {
            id: "dedication".to_string(),
            category: "streak".to_string(),
            title: "Dedication".to_string(),
            description: "Maintain a 100-day streak".to_string(),
            icon: "💎".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 100,
            hidden: false,
        },
        // Pet Care Achievements
        Achievement {
            id: "first_interaction".to_string(),
            category: "pet".to_string(),
            title: "Hello Friend".to_string(),
            description: "Interact with your pet for the first time".to_string(),
            icon: "👋".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 1,
            hidden: false,
        },
        Achievement {
            id: "caretaker".to_string(),
            category: "pet".to_string(),
            title: "Perfect Caretaker".to_string(),
            description: "Reach 100% on all care stats".to_string(),
            icon: "💖".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 1,
            hidden: false,
        },
        Achievement {
            id: "pet_evolved".to_string(),
            category: "pet".to_string(),
            title: "Growing Up".to_string(),
            description: "Evolve your pet to evolution stage 2".to_string(),
            icon: "🌱".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 1,
            hidden: false,
        },
        Achievement {
            id: "pet_mastery".to_string(),
            category: "pet".to_string(),
            title: "Pet Master".to_string(),
            description: "Evolve your pet to evolution stage 3".to_string(),
            icon: "🌳".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 1,
            hidden: false,
        },
        // Progression Achievements
        Achievement {
            id: "level_5".to_string(),
            category: "progression".to_string(),
            title: "Apprentice".to_string(),
            description: "Reach level 5".to_string(),
            icon: "📈".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 5,
            hidden: false,
        },
        Achievement {
            id: "level_10".to_string(),
            category: "progression".to_string(),
            title: "Expert".to_string(),
            description: "Reach level 10".to_string(),
            icon: "🎓".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 10,
            hidden: false,
        },
        Achievement {
            id: "wealthy".to_string(),
            category: "progression".to_string(),
            title: "Wealthy".to_string(),
            description: "Earn 1000 total coins".to_string(),
            icon: "💰".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 1000,
            hidden: false,
        },
        Achievement {
            id: "collector".to_string(),
            category: "progression".to_string(),
            title: "Collector".to_string(),
            description: format!(
                "Collect all {} accessories",
                crate::commands::shop::accessory_count()
            ),
            icon: "🎨".to_string(),
            unlocked_at: None,
            progress: 0,
            target: crate::commands::shop::accessory_count(),
            hidden: false,
        },
        // Special Achievements
        Achievement {
            id: "early_bird".to_string(),
            category: "special".to_string(),
            title: "Early Bird".to_string(),
            description: "Complete a session before 8am".to_string(),
            icon: "🌅".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 1,
            hidden: false,
        },
        Achievement {
            id: "night_owl".to_string(),
            category: "special".to_string(),
            title: "Night Owl".to_string(),
            description: "Complete a session after 10pm".to_string(),
            icon: "🌙".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 1,
            hidden: false,
        },
        Achievement {
            id: "perfectionist".to_string(),
            category: "special".to_string(),
            title: "Perfectionist".to_string(),
            description: "Complete all daily goals in one day".to_string(),
            icon: "✨".to_string(),
            unlocked_at: None,
            progress: 0,
            target: 1,
            hidden: false,
        },
    ]
}

/// Check and update achievement progress based on user progress
pub fn check_progress_achievements(
    achievements: &mut [Achievement],
    progress: &UserProgress,
) -> Vec<String> {
    let mut newly_unlocked = Vec::new();

    // Focus session achievements
    check_and_unlock(
        achievements,
        "first_session",
        progress.total_sessions,
        &mut newly_unlocked,
    );
    check_and_unlock(
        achievements,
        "focused_5",
        progress.total_sessions,
        &mut newly_unlocked,
    );
    check_and_unlock(
        achievements,
        "focused_25",
        progress.total_sessions,
        &mut newly_unlocked,
    );
    check_and_unlock(
        achievements,
        "focused_100",
        progress.total_sessions,
        &mut newly_unlocked,
    );

    // Streak achievements
    check_and_unlock(
        achievements,
        "streak_3",
        progress.streak_days,
        &mut newly_unlocked,
    );
    check_and_unlock(
        achievements,
        "streak_7",
        progress.streak_days,
        &mut newly_unlocked,
    );
    check_and_unlock(
        achievements,
        "streak_30",
        progress.streak_days,
        &mut newly_unlocked,
    );
    check_and_unlock(
        achievements,
        "dedication",
        progress.streak_days,
        &mut newly_unlocked,
    );

    // Progression achievements
    check_and_unlock(achievements, "level_5", progress.level, &mut newly_unlocked);
    check_and_unlock(
        achievements,
        "level_10",
        progress.level,
        &mut newly_unlocked,
    );

    newly_unlocked
}

/// Check and update pet-related achievements
pub fn check_pet_achievements(
    achievements: &mut [Achievement],
    pet: &PetState,
    total_coins: u32,
) -> Vec<String> {
    let mut newly_unlocked = Vec::new();

    // First interaction achievement
    if pet.last_interaction.is_some() {
        check_and_unlock(achievements, "first_interaction", 1, &mut newly_unlocked);
    }

    // Pet evolution achievements
    if pet.current_stage >= 1 {
        check_and_unlock(achievements, "pet_evolved", 1, &mut newly_unlocked);
    }
    if pet.current_stage >= 2 {
        check_and_unlock(achievements, "pet_mastery", 1, &mut newly_unlocked);
    }

    // Perfect care achievement
    if pet.energy == 100 && pet.hunger == 0 && pet.cleanliness == 100 && pet.affection == 100 {
        check_and_unlock(achievements, "caretaker", 1, &mut newly_unlocked);
    }

    // Wealthy achievement
    check_and_unlock(achievements, "wealthy", total_coins, &mut newly_unlocked);

    // Collector achievement
    check_and_unlock(
        achievements,
        "collector",
        pet.owned_accessories.len() as u32,
        &mut newly_unlocked,
    );

    newly_unlocked
}

/// Check daily summary for special achievements
pub fn check_daily_achievements(
    achievements: &mut [Achievement],
    summary: &DailySummary,
) -> Vec<String> {
    let mut newly_unlocked = Vec::new();

    // Marathon achievement
    check_and_unlock(
        achievements,
        "marathon",
        summary.sessions_completed,
        &mut newly_unlocked,
    );

    // Perfectionist achievement
    if summary.goals_completed >= 4 {
        check_and_unlock(achievements, "perfectionist", 1, &mut newly_unlocked);
    }

    newly_unlocked
}

/// Check time-based achievements
pub fn check_time_achievements(
    achievements: &mut [Achievement],
    completion_hour: u32,
) -> Vec<String> {
    let mut newly_unlocked = Vec::new();

    // Early bird (before 8am)
    if completion_hour < EARLY_BIRD_HOUR_CUTOFF {
        check_and_unlock(achievements, "early_bird", 1, &mut newly_unlocked);
    }

    // Night owl (after 10pm)
    if completion_hour >= NIGHT_OWL_HOUR_START {
        check_and_unlock(achievements, "night_owl", 1, &mut newly_unlocked);
    }

    newly_unlocked
}

/// Helper function to check and unlock an achievement
fn check_and_unlock(
    achievements: &mut [Achievement],
    id: &str,
    current_progress: u32,
    newly_unlocked: &mut Vec<String>,
) {
    if let Some(achievement) = achievements.iter_mut().find(|a| a.id == id) {
        if achievement.unlocked_at.is_none() {
            achievement.progress = current_progress;
            if achievement.progress >= achievement.target {
                achievement.unlocked_at = Some(chrono::Utc::now().to_rfc3339());
                newly_unlocked.push(achievement.id.clone());
            }
        }
    }
}

/// Get achievement statistics
pub fn get_achievement_stats(achievements: &[Achievement]) -> HashMap<String, u32> {
    let mut stats = HashMap::new();

    let total = achievements.len() as u32;
    let unlocked = achievements
        .iter()
        .filter(|a| a.unlocked_at.is_some())
        .count() as u32;

    stats.insert("total".to_string(), total);
    stats.insert("unlocked".to_string(), unlocked);
    stats.insert("locked".to_string(), total - unlocked);

    // Count by category
    for achievement in achievements {
        let category_key = format!("{}_total", achievement.category);
        *stats.entry(category_key).or_insert(0) += 1;

        if achievement.unlocked_at.is_some() {
            let category_unlocked_key = format!("{}_unlocked", achievement.category);
            *stats.entry(category_unlocked_key).or_insert(0) += 1;
        }
    }

    stats
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initialize_achievements() {
        let achievements = initialize_achievements();
        assert_eq!(achievements.len(), 20);
        assert!(achievements.iter().all(|a| a.unlocked_at.is_none()));
    }

    #[test]
    fn every_defined_achievement_has_a_reachable_unlock_condition() {
        let mut achievements = initialize_achievements();
        let progress = UserProgress {
            xp_total: u32::MAX,
            level: u32::MAX,
            streak_days: u32::MAX,
            longest_streak: u32::MAX,
            last_active_date: Some("2026-10-12".to_string()),
            total_sessions: u32::MAX,
            total_focus_minutes: u32::MAX,
            total_tasks_completed: u32::MAX,
        };
        let pet = PetState {
            last_interaction: Some("2026-10-12T00:00:00Z".to_string()),
            current_stage: 2,
            energy: 100,
            hunger: 0,
            cleanliness: 100,
            affection: 100,
            owned_accessories: vec![
                "party_hat".into(),
                "bow_tie".into(),
                "sunglasses".into(),
                "scarf".into(),
                "apple".into(),
                "cookie".into(),
            ],
            ..PetState::default()
        };
        let mut reached = check_progress_achievements(&mut achievements, &progress);
        reached.extend(check_pet_achievements(&mut achievements, &pet, u32::MAX));
        reached.extend(check_daily_achievements(
            &mut achievements,
            &DailySummary {
                sessions_completed: 10,
                goals_completed: 4,
                ..DailySummary::default()
            },
        ));
        reached.extend(check_time_achievements(&mut achievements, 7));
        reached.extend(check_time_achievements(&mut achievements, 22));
        assert_eq!(reached.len(), 20);
        assert_eq!(
            reached
                .into_iter()
                .collect::<std::collections::HashSet<_>>()
                .len(),
            20
        );
    }

    #[test]
    fn test_check_progress_achievements() {
        let mut achievements = initialize_achievements();
        let progress = UserProgress {
            xp_total: 500,
            level: 5,
            streak_days: 7,
            longest_streak: 7,
            last_active_date: Some("2026-02-15".to_string()),
            total_sessions: 25,
            total_focus_minutes: 625,
            total_tasks_completed: 10,
        };

        let unlocked = check_progress_achievements(&mut achievements, &progress);

        // Should unlock: first_session, focused_5, focused_25, streak_3, streak_7, level_5
        assert!(unlocked.contains(&"first_session".to_string()));
        assert!(unlocked.contains(&"focused_5".to_string()));
        assert!(unlocked.contains(&"focused_25".to_string()));
        assert!(unlocked.contains(&"streak_7".to_string()));
        assert!(unlocked.contains(&"level_5".to_string()));
    }

    #[test]
    fn test_achievement_stats() {
        let mut achievements = initialize_achievements();
        // Unlock a few achievements
        achievements[0].unlocked_at = Some("2026-02-15T10:00:00Z".to_string());
        achievements[1].unlocked_at = Some("2026-02-15T11:00:00Z".to_string());

        let stats = get_achievement_stats(&achievements);
        assert_eq!(stats.get("total").unwrap(), &20);
        assert_eq!(stats.get("unlocked").unwrap(), &2);
        assert_eq!(stats.get("locked").unwrap(), &18);
    }

    #[test]
    fn test_time_achievements() {
        let mut achievements = initialize_achievements();

        // Test early bird
        let unlocked = check_time_achievements(&mut achievements, 7);
        assert!(unlocked.contains(&"early_bird".to_string()));

        // Test night owl
        let unlocked = check_time_achievements(&mut achievements, 23);
        assert!(unlocked.contains(&"night_owl".to_string()));
    }
}
