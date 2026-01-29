"use client"

export default function PlaySection() {
  const playModes = [
    { name: "3-Minute Rush", description: "Solve as many problems as you can in 3 minutes", icon: "⚡" },
    { name: "5-Minute Rush", description: "Solve as many problems as you can in 5 minutes", icon: "⚡⚡" },
    { name: "Survival", description: "Keep solving until you get one wrong", icon: "💪" },
    { name: "Challenge Friend", description: "Invite a friend to a competitive match", icon: "🤝" },
    { name: "Ranked Match", description: "Play against random players for rating", icon: "🏆" },
    { name: "Custom", description: "Create your own challenge rules", icon: "⚙️" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Play Modes</h2>
        <p className="text-muted-foreground">Choose a game mode to start playing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {playModes.map((mode) => (
          <button
            key={mode.name}
            className="bg-card border border-border rounded-lg p-6 hover:border-primary hover:bg-card/80 transition-all text-left group"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{mode.icon}</div>
            <h3 className="text-lg font-semibold text-foreground">{mode.name}</h3>
            <p className="text-sm text-muted-foreground mt-2">{mode.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
