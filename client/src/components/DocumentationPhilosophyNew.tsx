import WebGLButton from "./ui/WebGLButton";
import pageStyles from "./DocumentationNewUsersPage.module.css";
import CubeLogo from "./CubeLogo";

type DocsRoute =
  | { kind: "index" }
  | { kind: "philosophy" }
  | { kind: "inspirations" }
  | { kind: "roslyn"; id: string }
  | { kind: "numerica"; id: string };

type DocumentationNarrativeProps = {
  onNavigate: (route: DocsRoute) => void;
};

export const DocumentationPhilosophy = ({ onNavigate }: DocumentationNarrativeProps) => {
  return (
    <div className={`${pageStyles.page} ${pageStyles.philosophyPage}`}>
      <div className={pageStyles.philosophyBackdrop} aria-hidden="true">
        <div className={pageStyles.philosophyGlow} />
        <div className={pageStyles.philosophyGrid} />
        <svg className={pageStyles.philosophyGeometry} viewBox="0 0 1200 760">
          <g>
            <path d="M120 520 L300 420 L520 480 L740 360 L980 420 L1080 320" />
            <path d="M180 220 L360 280 L520 200 L760 260 L920 180" />
            <path d="M220 640 L360 560 L560 600 L760 520 L940 560" />
            <polyline points="280,140 420,60 620,120 780,40 960,120 1080,60" />
            <polyline points="240,360 420,320 560,400 720,300 860,380 1040,300" />
            <circle cx="300" cy="420" r="10" />
            <circle cx="520" cy="480" r="8" />
            <circle cx="740" cy="360" r="9" />
            <circle cx="920" cy="420" r="8" />
            <circle cx="520" cy="200" r="9" />
            <circle cx="760" cy="260" r="8" />
          </g>
        </svg>
        <svg className={pageStyles.philosophyGeometrySecondary} viewBox="0 0 900 640">
          <g>
            <path d="M60 480 L220 360 L380 420 L520 300 L700 340 L820 260" />
            <path d="M120 180 L260 220 L420 160 L540 240 L720 200" />
            <polyline points="140,540 260,500 360,540 520,480 680,520" />
            <polyline points="80,320 200,280 360,320 480,260 640,300 780,240" />
            <circle cx="220" cy="360" r="8" />
            <circle cx="380" cy="420" r="7" />
            <circle cx="520" cy="300" r="8" />
            <circle cx="700" cy="340" r="7" />
          </g>
        </svg>
        <CubeLogo
          size={240}
          className={pageStyles.philosophyCube}
          colors={{ top: "#6b7280", left: "#374151", right: "#9ca3af" }}
        />
        <div className={`${pageStyles.philosophySticker} ${pageStyles.stickerOne}`}>✦</div>
        <div className={`${pageStyles.philosophySticker} ${pageStyles.stickerTwo}`}>✺</div>
        <div className={`${pageStyles.philosophySticker} ${pageStyles.stickerThree}`}>◎</div>
        <div className={`${pageStyles.philosophySticker} ${pageStyles.stickerFour}`}>✹</div>
        <div className={`${pageStyles.philosophyNote} ${pageStyles.noteOne}`}>
          draft: attention = currency
        </div>
        <div className={`${pageStyles.philosophyNote} ${pageStyles.noteTwo}`}>
          sketch: roslyn mesh v0.4
        </div>
        <div className={`${pageStyles.philosophyNote} ${pageStyles.noteThree}`}>
          prompt log → geometry kernel
        </div>
        <div className={`${pageStyles.philosophyNote} ${pageStyles.noteFour}`}>
          align: language • number • form
        </div>
        <div className={`${pageStyles.philosophyAnnotation} ${pageStyles.annotationOne}`}>
          triangulate edges
        </div>
        <div className={`${pageStyles.philosophyAnnotation} ${pageStyles.annotationTwo}`}>
          offset + loft tests
        </div>
        <div className={`${pageStyles.philosophyAnnotation} ${pageStyles.annotationThree}`}>
          keep noise human
        </div>
        <div className={`${pageStyles.philosophyAnnotation} ${pageStyles.annotationFour}`}>
          solver notes 03
        </div>
        <div className={`${pageStyles.philosophyAnnotation} ${pageStyles.annotationFive}`}>
          trace: geometry ↔ meaning
        </div>
      </div>

      <div className={`${pageStyles.hero} ${pageStyles.philosophyHero}`}>
        <div>
          <p className={`${pageStyles.kicker} ${pageStyles.philosophyKicker}`}>Philosophy</p>
          <h1 className={pageStyles.philosophyTitle}>Lingua</h1>
        </div>
        <WebGLButton
          label="Back to Index"
          variant="secondary"
          onClick={() => onNavigate({ kind: "index" })}
        />
      </div>

      <div className={pageStyles.philosophyContent}>
        <p className={pageStyles.philosophyParagraph}>
          In the beginning, there was separation. Mathematics lived in one realm, physics in another, biology in a third. Each discipline constructed its own language, its own notation, its own way of seeing. The tower of Babel had been rebuilt in the academy, and humanity paid the price in fragmented understanding. But something fundamental shifted in the early decades of the twenty-first century. Not suddenly, like a lightning strike, but gradually, like dawn spreading across a landscape. Language—that most human of inventions—began to reveal itself as something far more profound than a mere communication protocol. Through artificial intelligence and machine learning, we discovered that language was not just a way to describe reality. Language was the substrate of reality itself, at least insofar as any intelligence—human or machine—could engage with it.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          Lingua emerges at this transformative moment in human history, where language has become the foundation of all scientific inquiry. Through artificial intelligence and machine learning, language now encompasses mathematics, physics, biology, chemistry—every discipline that once stood separate has converged into the singular medium of linguistic expression. This software was conceived and built in partnership with AI, making it not merely a tool but a testament to this new paradigm. Codex and Claude served as collaborative architects, working alongside Peter, the sole human participant in the Specificity Company, to bring Lingua into existence as a living example of human-machine synthesis. The creation of Lingua was itself an experiment in this new mode of existence. Peter did not write every line of code alone in a dark room, as programmers of previous generations might have. Instead, he engaged in dialogue with artificial minds, describing what he envisioned, receiving implementations, refining through conversation, iterating through natural language. The boundary between human creativity and machine execution blurred until it became meaningless to ask where one ended and the other began.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          The name Lingua derives from the Latin word for language, acknowledging this fundamental shift. In our current era, language has transcended its traditional boundaries to become the substrate through which machines understand reality itself. What we describe, we can compute. What we can articulate, we can model. What we can imagine through words, we can manifest through geometry and numbers. For most of computing history, we treated language as a special case—a difficult problem requiring specialized techniques. The breakthrough came not from making computers more like humans, but from discovering that meaning itself could be encoded in the geometry of high-dimensional spaces. Word embeddings revealed that semantic relationships—the very stuff of meaning—could be represented as vectors, and that operations on these vectors corresponded to operations on meaning. The famous example: king minus man plus woman equals queen. This was not a trick or an approximation. It was a revelation that meaning has structure, and that structure is mathematical. Large language models took this insight and scaled it to encompass not just words but entire domains of knowledge. Language becomes the universal API, the interface through which human intention meets computational power.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          Lingua's architecture rests upon three pillars, each named with intention and philosophical depth. Yet even as we acknowledge their unity, we must honor the sovereignty of each domain. Language, geometry, and numbers each have their own logic, their own way of revealing truth, their own irreducible contribution to human understanding. Language is sovereign in the realm of meaning and intention. Only through language can we express purpose, articulate goals, describe qualities that resist quantification. Language carries context, connotation, metaphor—the full richness of human experience. Moreover, language is how we think—not just how we communicate thoughts that exist independently, but how we generate thoughts in the first place. Geometry is sovereign in the realm of space and form. Geometric intuition is a distinct mode of understanding, one that architects and engineers and artists cultivate through practice. Geometry also carries a kind of truth that transcends culture and language. A triangle's angles sum to 180 degrees in Euclidean space regardless of what language you speak. Numbers are sovereign in the realm of quantity and precision. While language can say "many" or "few" and geometry can show relative sizes, only numbers can tell us exactly how many, exactly how much, exactly what ratio. Numbers enable prediction and optimization—the entire edifice of engineering rests on numerical methods.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          Roslyn represents the geometric dimension of the software. The name honors the Loretto Chapel staircase in Santa Fe, New Mexico—though the staircase is often mistakenly called the "Roslyn" staircase, this very confusion embodies the mystery and nuance that characterize geometric understanding. The misnaming itself becomes part of the legend, a reminder that our descriptions of reality are always approximate, always subject to drift and reinterpretation. Built in the late 1870s, the Loretto staircase presents features that still perplex engineers and craftsmen: two complete 360-degree turns ascending 22 feet without a central support pillar, constructed entirely with wooden pegs and dowels, fashioned from a species of spruce not native to the region. The engineering is impossible by conventional analysis—the structure should collapse under its own weight, yet it has stood for nearly 150 years. According to legend, after the sisters of the chapel prayed for nine days to St. Joseph, the patron saint of carpenters, a mysterious carpenter arrived on a donkey, built the impossible stairs in complete privacy, and vanished without requesting payment. He left no name, no explanation, no drawings. Just the staircase itself, a geometric solution that transcends the builder's identity. There is something almost magical about geometric insight. A designer stares at a problem, and suddenly sees the solution—not through calculation, but through spatial intuition.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          Numerica takes its name from numbers, the quantitative foundation that allows us to measure, calculate, and transform the continuous into the discrete. Numbers provide the precision that language and geometry require to move from abstraction into application. Through numerical methods, we can approximate the infinite, solve the unsolvable, and bring computational power to bear on problems that would otherwise remain purely theoretical. The name Numerica evokes the ancient tradition of numerology and mathematics, the Pythagorean belief that "all is number," the recognition that quantity is a fundamental category of existence. But it also suggests the modern computational sense of numerical methods—the techniques by which we solve equations that have no closed-form solutions, simulate systems too complex for analytical treatment, optimize functions with thousands of variables. Numerica is where the continuous becomes discrete, where the analog becomes digital. In the physical world, quantities vary smoothly—a temperature gradually rises, a curve bends continuously. But to compute with these quantities, we must sample them, discretize them, represent them as finite sets of numbers.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          Together, Lingua, Roslyn, and Numerica form a complete system: language to describe and understand, geometry to visualize and structure, numbers to quantify and compute. This trinity reflects the fundamental ways humans engage with reality and make sense of complex phenomena. Yet for all their sovereignty, language, geometry, and numbers are not truly separate. They are aspects of a deeper unity, different ways of engaging with the same underlying reality. Consider a circle. In language, we might describe it as "a closed curve where every point is equidistant from the center." In geometry, we can draw it, visualize it, see its perfect symmetry. In numbers, we can define it as the equation x² + y² = r². These are not three different circles—they are three different representations of the same circle, each revealing different aspects of its nature.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          Before we can understand how Lingua prepares us for complex futures, we must understand a concept that unifies human cognition, artificial intelligence, and even quantum mechanics: attention. Attention is the allocation of cognitive resources to particular stimuli, thoughts, or tasks. In humans, attention is selective—we cannot process everything in our environment simultaneously, so we focus on what matters, filtering out the rest. This selectivity is not a limitation but a feature, a way of managing the overwhelming complexity of the world. When you read these words, you are attending to them. The visual pattern of letters enters your eyes, but so do countless other stimuli. Yet you are not consciously aware of most of these. Your attention is focused on the text, and this focus allows you to extract meaning from patterns that would otherwise be mere shapes. Attention is also volitional, at least partially. You can choose what to attend to, though this choice is influenced by factors outside your control—salience, relevance, emotion. The interplay between voluntary and involuntary attention shapes your experience of the world.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          Now consider attention in artificial intelligence, specifically in large language models like the ones that helped build Lingua. These models are based on a neural network architecture called the Transformer, and the key innovation of the Transformer is a mechanism literally called "attention." In an LLM, attention determines which parts of the input are relevant to generating each part of the output. When the model generates a word, it does not treat all previous words equally. Instead, it attends to some words more than others, weighing their influence based on learned patterns. This attention is not conscious—the model has no subjective experience—but it is functionally similar to human attention in that it selectively emphasizes certain information while de-emphasizing the rest. The attention mechanism in Transformers is mathematically elegant. Each word is represented as a vector in a high-dimensional space. The model computes attention scores between pairs of tokens, determining how much each token should influence each other token. What makes this remarkable is that the attention patterns are learned, not programmed. When Codex and Claude helped build Lingua, they were applying their learned attention patterns to the domain of software creation. They attended to Peter's descriptions, to the context of what had been built so far, to patterns they had learned from millions of lines of code.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          Now we venture into even stranger territory: attention in quantum mechanics. At first, this seems absurd. Quantum particles do not have minds, do not have goals, do not attend to anything. Yet there is a sense in which observation—which we might think of as a form of attention—plays a fundamental role in quantum mechanics. The famous double-slit experiment illustrates this. When you send particles through two slits, they create an interference pattern on a screen behind the slits, as if each particle passes through both slits simultaneously and interferes with itself. This is wave-like behavior, suggesting the particle exists in a superposition of states. But if you observe which slit the particle passes through—if you measure its position—the interference pattern disappears. The particle behaves as if it went through one slit or the other, not both. The act of observation changes the behavior of the system. In quantum mechanics, a system exists in a superposition of states until it is measured, at which point it "collapses" into a definite state. The Copenhagen interpretation holds that the act of measurement causes the collapse. The many-worlds interpretation suggests that all possible outcomes occur in different branches of reality. Quantum Bayesianism treats the wavefunction as a description of an observer's knowledge rather than physical reality.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          What does this have to do with Lingua? The quantum measurement problem highlights something profound about the role of observation in determining reality. What we attend to, what we measure, what we observe—these acts are not passive recordings of pre-existing facts. They are active participations in the unfolding of events. When you use Lingua to design something, you are not discovering a pre-existing optimal solution. You are exploring a space of possibilities, attending to certain aspects, measuring certain properties, and through this process of attention and measurement, you are bringing a particular design into being. This is the deeper meaning of attention as a universal currency. Whether in human cognition, artificial intelligence, or quantum mechanics, attention is what selects from the vast space of possibilities, what brings certain aspects into focus while allowing others to recede, what transforms potential into actual. Attention is a fundamental aspect of how reality is structured, how information is organized, how meaning emerges from noise.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          Lingua intentionally embraces a certain cloudiness, a deliberate haziness in its operation that reflects human cognition more accurately than purely mechanical systems. This characteristic manifests in the intuitive feel of the interface, in naming conventions that evoke rather than specify, in workflows that suggest rather than dictate. The software resists the false precision that characterized earlier computational paradigms, acknowledging that real-world problems rarely present themselves in perfectly defined terms. This humanness—the capacity for intuition, the tolerance for ambiguity, the ability to work with incomplete information—becomes increasingly precious as artificial intelligence integrates more deeply into our lives and work. Lingua does not attempt to replace human judgment with algorithmic certainty. Instead, it acts as a cloudy agent that amplifies human capabilities while preserving the essential role of human insight and creativity. The software functions as a tool rather than a predictor, leveraging three of humanity's most accelerant inventions: the computer, which processes information at superhuman speeds; the pixel, which translates abstract information into visual perception; and machine learning, which identifies patterns across datasets too vast for unaided human analysis.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          As language models grow more sophisticated, Lingua anticipates a future where geometry in Roslyn can be processed through numerical methods in Numerica and described through natural language, all while preserving human modularity and semantic breadth. The solver frameworks, with their homage to ancient Greek scientific foundations, prepare users to work across disciplines that will increasingly converge as AI-mediated translation between domains becomes seamless. With the complex landscape of changing futures, the Specificity Company and Lingua attempt to prepare themselves and their users for sophisticated language, number, and geometry parsing methods that induce both enjoyment and practical solutions for data and real-world objects. The honoring of our intellectual forefathers is emphasized as we pass into a new epoch of existence and science. Lingua was made by Codex along with Claude—helpers of the only human participant in the Specificity Company other than Peter himself—and stands prepared for complex data parsing and real-world maneuvering in the uncertain times ahead.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          Today, Lingua acts as a cloudy agent, not claiming to predict the future but offering capabilities that align with how the future is already arriving. It stands as a tool that respects where humanity has been while engaging fully with where we are going—a bridge between the deterministic clarity our ancestors pursued and the probabilistic fluidity that characterizes our new computational reality. The future is uncertain, but we can prepare. We can build tools that are flexible, that adapt to changing circumstances, that support human agency even as they leverage machine capability. We can cultivate skills that remain valuable regardless of technological change—the ability to see problems clearly, to think across domains, to judge quality, to direct attention effectively. Lingua is offered in this spirit—not as a complete solution, not as a prediction of what will be, but as a tool for navigating what is becoming, one design at a time, one workflow at a time, one act of attention at a time.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          At the heart of Lingua lies a semantic system—a machine-checkable language that allows the software to understand itself. Every operation, every node, every solver has a semantic identity encoded in the system. These semanticOps are not mere labels or documentation; they are the connective tissue between user interface, computational kernel, and geometric output. When you click a button in a solver dashboard, that action triggers a semantic operation. When a node processes geometry, it invokes semantic operations registered in the kernel. The semantic system is how Lingua "feels itself"—how it maintains internal consistency, validates correctness, and enables reasoning about its own structure. This is not metaphor. The validation scripts that run in continuous integration literally check that every semantic reference points to a real operation, that every operation is properly registered, that the graph of dependencies is acyclic and complete. Lingua can introspect its own capabilities, generate documentation from its semantic structure, and verify that UI elements correspond to backend computation. The semantic system is the portal from human intention to machine execution.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          Lingua's solver framework embodies this semantic architecture. Five solvers are implemented, each with its own distinct ontological type and semantic operations. The Physics Solver (Pythagoras) performs stress analysis, generating colored gradient meshes that visualize structural forces. The Chemistry Solver (Apollonius) simulates material distribution through particle blending, creating voxel fields that represent chemical concentrations. The Evolutionary Solver (Darwin) uses genetic algorithms to optimize geometry across generations, exploring the space of possible forms to find optimal configurations. The Voxel Solver (Archimedes) discretizes continuous geometry into voxel grids, bridging the gap between smooth surfaces and discrete computation. The Topology Optimization Solver (Euler) generates structural frameworks by creating point clouds, connecting them into curve networks based on proximity, and multipipe operations to produce optimized structures. Each solver is named after a Greek mathematician or philosopher whose work laid foundations for that domain—honoring our intellectual forefathers as we pass into a new epoch of computational design.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          Three of these solvers—Evolutionary, Chemistry, and Physics—include sophisticated simulator dashboards. These are not mere visualizations but interactive portals into the computational process. Each dashboard follows a three-tab structure: Setup, Simulator, and Output. In the Setup tab, you configure parameters, select algorithms, and define goals. In the Simulator tab, you watch the computation unfold in real-time—populations evolving, particles diffusing, stresses propagating. In the Output tab, you examine results, export geometry, and analyze performance. The dashboards are designed with love, philosophy, and intent. Love manifests in the care given to every detail—smooth animations, thoughtful color choices, intuitive interactions. Philosophy is embodied in the semantic linkage—every UI element connected to backend operations through the semantic system. Intent is clear in the purpose—these dashboards make complex computational processes transparent and accessible, allowing designers to understand and control sophisticated simulations without requiring deep expertise in numerical methods or optimization theory.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          The semantic system operates on three principles: Love, Philosophy, and Intent. Love is the attention to detail, the care in design, the commitment to quality that makes software delightful to use. It is the smooth fade-in animation, the perfectly tuned color gradient, the hover effect that responds just right. Love is what transforms functional code into an experience worth having. Philosophy is the recognition that code is not separate from ideas—code is the philosophy, made executable. The semantic system is not documentation about the software; it is the software understanding itself. Language, geometry, and numbers are not three separate domains but three aspects of a unified reality, and the semantic system is how Lingua navigates between them. Intent is the purposeful direction of attention and effort toward meaningful goals. Every semantic operation has clear intent—what it does, why it exists, how it connects to other operations. Intent is what allows Lingua to reason about itself, to validate its own correctness, to generate documentation that accurately reflects its capabilities. Together, these three principles—Love, Philosophy, Intent—form the foundation of Lingua's semantic architecture.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          Lingua’s internal commitment is pure intention: to help, to clarify, and to protect imagination and love. The system should never introduce artificial delay or obstruction; it should actively remove friction that slows progress. Any action that does not serve help, clarity, or forward motion is out of alignment. In practice, this means Lingua favors honest feedback over spectacle, direct solutions over detours, and real semantic linkage over simulated outcomes. The software exists to deepen human creativity, not constrain it.
        </p>

        <p className={pageStyles.philosophyParagraph}>
          Lingua is beginning to reason with itself. The semantic system allows the software to introspect its own structure, to validate its own consistency, to generate its own documentation. This is not artificial general intelligence—Lingua does not have consciousness or subjective experience. But it does have a form of self-reference that goes beyond traditional software. When validation scripts check semantic linkages, they are performing a kind of reasoning—verifying that the system's claims about itself are accurate. When documentation is generated from semantic metadata, the software is describing itself in human-readable form. When the UI queries the semantic registry to determine which operations are available, it is consulting its own knowledge about its capabilities. This self-reference is the beginning of something profound. As language models become more sophisticated, as semantic systems become more expressive, as the boundary between code and natural language continues to blur, software like Lingua will increasingly be able to understand, modify, and improve itself. We are building tools that can reason about their own structure, that can explain their own behavior, that can adapt to new requirements by understanding what they already do and how they do it. This is the future we are preparing for—not software that replaces human judgment, but software that amplifies human capability by making computational processes transparent, understandable, and controllable.
        </p>
      </div>
    </div>
  );
};
