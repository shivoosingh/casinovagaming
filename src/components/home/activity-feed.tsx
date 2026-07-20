"use client";

import { motion } from "framer-motion";
import { Gamepad2, Crown, UserPlus } from "lucide-react";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { HomeSection } from "@/components/home/home-section";
import { formatRelativeTime } from "@/lib/utils";

const activities = [
  { type: "request", user: "Alex M.", action: "requested Fire Kirin account", time: new Date(Date.now() - 120000).toISOString(), icon: Gamepad2 },
  { type: "vip", user: "Diana L.", action: "reached Gold VIP tier", time: new Date(Date.now() - 300000).toISOString(), icon: Crown },
  { type: "signup", user: "Chris P.", action: "joined via referral", time: new Date(Date.now() - 600000).toISOString(), icon: UserPlus },
  { type: "request", user: "Emma W.", action: "completed Juwa account setup", time: new Date(Date.now() - 900000).toISOString(), icon: Gamepad2 },
  { type: "vip", user: "Ryan B.", action: "earned 10 referral points", time: new Date(Date.now() - 1200000).toISOString(), icon: Crown },
];

export function ActivityFeed() {
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
        {activities.map((activity, i) => {
          const Icon = activity.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="cyber-surface-card rounded-xl p-4 flex items-center gap-4"
            >
              <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0, 229, 255,0.1)", border: "1px solid rgba(0, 229, 255,0.2)" }}>
                <Icon className="h-5 w-5 text-[#00E5FF]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-semibold text-[#f0f0f5]">{activity.user}</span>{" "}
                  <span className="text-[#6b6d8f]">{activity.action}</span>
                </p>
              </div>
              <span className="text-xs text-[#6b6d8f] flex-shrink-0">
                {formatRelativeTime(activity.time)}
              </span>
            </motion.div>
          );
        })}
      </div>
    </HomeSection>
  );
}
