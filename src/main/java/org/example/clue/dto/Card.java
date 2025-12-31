package org.example.clue.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@AllArgsConstructor
@NoArgsConstructor
public class Card {
    public enum CardType { SUSPECT, WEAPON, ROOM }

    private CardType type;
    private String name; // 예: "MUSTARD", "ROPE", "KITCHEN"
    private String imageUrl; // 프론트엔드 표시용 이미지 경로 (선택 사항)

    @Override
    public String toString() {
        return type + ":" + name;
    }
}