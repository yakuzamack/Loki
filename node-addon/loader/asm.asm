Hasher1 proto

.code 

Hasher1 proc
    xor rax, rax

    h1loop:
        add al, [rdx]
        xor al, 0CCh
        rol rax, 6h
        inc rdx   
        dec rcx  
        test cl, cl
        jnz h1loop
        ret

Hasher1 endp
end