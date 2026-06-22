package com.qrorder.entity;

import com.qrorder.entity.enums.Role;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String username;

    private String password;

    @Enumerated(EnumType.STRING)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", foreignKey = @ForeignKey(name = "fk_user_branch"))
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Branch branch;

    @Transient
    public Long getBranchId() {
        return branch != null ? branch.getId() : null;
    }

    @Transient
    public String getBranchName() {
        return branch != null ? branch.getName() : null;
    }
}