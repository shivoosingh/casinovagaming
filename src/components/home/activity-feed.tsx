"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { HomeSection } from "@/components/home/home-section";
import { formatRelativeTime } from "@/lib/utils";
import { getCommunityActivity, type ActivityItem } from "@/lib/rewards/community-activity";

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    void getCommunityActivity().then(setActivities).catch(() => setActivities([]));
  }, []);

  return (
    <HomeSection tinted>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          <h2 className="text-2xl sm:text-3xl font-bold">
            Recent <span className="gradient-text">Activity</span>
          </h2>
          <LiveBadge />
        </div>
        <p className="text-[#6b6d8f] text-sm">Live updates from the Casinova Gaming community</p>
      </motion.div>

      <div className="space-y-3 max-w-2xl mx-auto">
        {activities.length === 0 ? (
          <p className="text-center text-sm text-[#6b6d8f]">Recent joins and wheel wins show up here.</p>
        ) : (
          activities.map((activity, i) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="cyber-surface-card rounded-xl p-4 flex items-center gap-4"
            >
              <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0, 229, 255,0.1)", border: "1px solid rgba(0, 229, 255,0.2)" }}>
                <Sparkles className="h-5 w-5 text-[#00E5FF]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-semibold text-[#f0f0f5]">{activity.name}</span>{" "}
                  <span className="text-[#6b6d8f]">{activity.action}</span>
                </p>
              </div>
              <span className="text-xs text-[#6b6d8f] flex-shrink-0">
                {formatRelativeTime(activity.at)}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </HomeSection>
  );
}
